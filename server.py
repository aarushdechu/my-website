import base64
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import smtplib
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from collections import deque
from email.message import EmailMessage
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import requests


ROOT = Path(__file__).resolve().parent

def load_dotenv():
    env_path = ROOT / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_dotenv()

PORT = int(os.environ.get("PORT", "8001"))
HOST = os.environ.get("HOST", "0.0.0.0")
REQUEST_WINDOW_SECONDS = 60
MAX_REQUESTS_PER_WINDOW = int(os.environ.get("GEMINI_RPM_LIMIT", "15"))
COOLDOWN_SECONDS = float(os.environ.get("QUADRATIC_COOLDOWN_SECONDS", "1"))
MAX_HISTORY_MESSAGES = int(os.environ.get("QUADRATIC_HISTORY_MESSAGES", "6"))
MAX_OUTPUT_TOKENS = int(os.environ.get("GEMINI_MAX_OUTPUT_TOKENS", "900"))
SESSION_COOKIE_NAME = "aarush_session"
VISITOR_COOKIE_NAME = "aarush_visitor"
SESSION_SECONDS = int(os.environ.get("SESSION_SECONDS", str(7 * 24 * 60 * 60)))
VISITOR_SECONDS = int(os.environ.get("VISITOR_SECONDS", str(180 * 24 * 60 * 60)))
PASSWORD_ITERATIONS = 210_000
RESET_CODE_SECONDS = int(os.environ.get("RESET_CODE_SECONDS", "600"))
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
BOT_USER_AGENT_PATTERN = re.compile(
    r"bot|crawl|spider|preview|slurp|facebookexternalhit|whatsapp|telegram|discord|uptime|monitor|curl|python-urllib",
    re.IGNORECASE,
)
SMTP_TIMEOUT_SECONDS = 20
USERS_DB_PATH = Path(os.environ.get("USERS_DB_PATH", "users.db"))
if not USERS_DB_PATH.is_absolute():
    USERS_DB_PATH = ROOT / USERS_DB_PATH
STATS_PATH = Path(os.environ.get("STATS_PATH", "site-stats.json"))
if not STATS_PATH.is_absolute():
    STATS_PATH = ROOT / STATS_PATH
request_times = deque()
email_verification_codes = {}
password_reset_codes = {}
last_request_time = 0.0
stats_lock = threading.Lock()
DEFAULT_STATS = {
    "visits": 0,
    "uniqueVisitors": 0,
    "productsSold": 0,
    "quadraticMessages": 0,
}


def build_tutor_input(payload):
    history = (payload.get("history") or [])[-MAX_HISTORY_MESSAGES:]
    question = payload.get("question", "")
    local_hint = payload.get("localHint", "")

    if history:
        conversation = "\n\n".join(
            f"{'Aarush' if item.get('role') == 'user' else 'Quadratic'}: {item.get('content', '')}"
            for item in history
        )
    else:
        conversation = "No earlier messages in this chat."

    return "\n".join(
        [
            "Conversation so far:",
            conversation,
            "",
            "New message from Aarush:",
            question,
            "",
            "Local solver hint, if useful:",
            local_hint or "No local hint.",
            "",
            "If the local solver hint gives a theorem-based solution with named lengths, verify it and use it as the backbone of your answer.",
            "Do not switch to unrelated formulas like circle area or circumference unless the user explicitly asks for those.",
            "Respond as Quadratic. If Aarush gave a preferred method, use it.",
            "Teach slowly with explanations, not just an answer.",
            "For geometry, carefully identify the theorem before calculating.",
            "Give a complete answer, including each requested quantity.",
        ]
    )


def read_stats():
    if not STATS_PATH.exists():
        return DEFAULT_STATS.copy()

    try:
        data = json.loads(STATS_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        return DEFAULT_STATS.copy()

    stats = DEFAULT_STATS.copy()
    for key in stats:
        try:
            stats[key] = max(0, int(data.get(key, stats[key])))
        except (TypeError, ValueError):
            stats[key] = DEFAULT_STATS[key]
    return stats


def write_stats(stats):
    STATS_PATH.write_text(json.dumps(stats, indent=2, sort_keys=True))


def increment_stat(key, amount=1):
    if key not in DEFAULT_STATS:
        return DEFAULT_STATS.copy()

    try:
        amount = int(amount)
    except (TypeError, ValueError):
        amount = 1

    if amount <= 0:
        amount = 1

    with stats_lock:
        stats = read_stats()
        stats[key] = stats.get(key, 0) + amount
        write_stats(stats)
        return stats


def encode_base64url(data):
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def decode_base64url(text):
    padding = "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode((text + padding).encode("utf-8"))


def get_session_secret():
    return os.environ.get("SESSION_SECRET", "")


def create_session_token(username):
    secret = get_session_secret()
    if not secret:
        return ""

    payload = {
        "username": username,
        "expires": int(time.time() + SESSION_SECONDS),
        "nonce": secrets.token_urlsafe(12),
    }
    payload_text = encode_base64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(secret.encode("utf-8"), payload_text.encode("utf-8"), hashlib.sha256).digest()
    return f"{payload_text}.{encode_base64url(signature)}"


def verify_session_token(token):
    secret = get_session_secret()
    if not secret or "." not in token:
        return None

    payload_text, signature_text = token.rsplit(".", 1)
    expected_signature = hmac.new(secret.encode("utf-8"), payload_text.encode("utf-8"), hashlib.sha256).digest()

    try:
        supplied_signature = decode_base64url(signature_text)
    except Exception:
        return None

    if not hmac.compare_digest(expected_signature, supplied_signature):
        return None

    try:
        payload = json.loads(decode_base64url(payload_text).decode("utf-8"))
    except Exception:
        return None

    if int(payload.get("expires", 0)) < time.time():
        return None

    return payload.get("username")


def build_session_cookie(value, max_age=SESSION_SECONDS):
    return build_cookie(SESSION_COOKIE_NAME, value, max_age, http_only=True)


def build_visitor_cookie(value, max_age=VISITOR_SECONDS):
    return build_cookie(VISITOR_COOKIE_NAME, value, max_age, http_only=True)


def build_cookie(name, value, max_age, http_only=False):
    secure_cookie = os.environ.get("COOKIE_SECURE", "").lower() == "true"
    parts = [
        f"{name}={value}",
        "Path=/",
        f"Max-Age={max_age}",
        "SameSite=None" if secure_cookie else "SameSite=Lax",
    ]

    if http_only:
        parts.append("HttpOnly")

    if secure_cookie:
        parts.append("Secure")

    return "; ".join(parts)


def is_probably_bot(user_agent):
    return bool(BOT_USER_AGENT_PATTERN.search(user_agent or ""))


def init_user_db():
    USERS_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(USERS_DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                full_name TEXT NOT NULL DEFAULT '',
                delivery_address TEXT NOT NULL DEFAULT '',
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
            """
        )
        existing_columns = {
            row[1] for row in connection.execute("PRAGMA table_info(users)").fetchall()
        }
        if "full_name" not in existing_columns:
            connection.execute("ALTER TABLE users ADD COLUMN full_name TEXT NOT NULL DEFAULT ''")
        if "delivery_address" not in existing_columns:
            connection.execute("ALTER TABLE users ADD COLUMN delivery_address TEXT NOT NULL DEFAULT ''")
        if "google_sub" not in existing_columns:
            connection.execute("ALTER TABLE users ADD COLUMN google_sub TEXT NOT NULL DEFAULT ''")
        connection.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub != ''"
        )


def normalize_username(username):
    return str(username or "").strip().lower()


def is_valid_email(email):
    return bool(EMAIL_PATTERN.match(normalize_username(email)))


def clean_text(text):
    return " ".join(str(text or "").strip().split())


def profile_initial(display_name, email):
    source = clean_text(display_name) or normalize_username(email)
    return source[:1].upper() if source else "?"


def public_user_payload(username):
    user = get_user(username)
    email = normalize_username(username)
    display_name = ""
    if user:
        email = user["username"]
        display_name = user["full_name"] or user["username"].split("@", 1)[0]
    else:
        display_name = email.split("@", 1)[0]

    return {
        "authenticated": True,
        "username": display_name,
        "email": email,
        "displayName": display_name,
        "profileInitial": profile_initial(display_name, email),
    }


def auth_response_payload(username, session_token):
    payload = public_user_payload(username)
    payload["sessionToken"] = session_token
    return payload


def validate_password_policy(password):
    missing = []

    if len(password) <= 8:
        missing.append("more than 8 characters")
    if not any(character.islower() for character in password):
        missing.append("a lowercase letter")
    if not any(character.isupper() for character in password):
        missing.append("a capital letter")
    if not any(character.isdigit() for character in password):
        missing.append("a number")
    if not any(not character.isalnum() for character in password):
        missing.append("a symbol")

    if not missing:
        return ""

    return "Password needs " + ", ".join(missing) + "."


def get_smtp_settings():
    try:
        port = int(os.environ.get("SMTP_PORT", "587").strip())
    except ValueError:
        port = 587

    security = os.environ.get("SMTP_SECURITY", "auto").strip().lower()
    use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() == "true"
    if security not in {"auto", "starttls", "ssl", "none"}:
        security = "auto"
    if security == "auto":
        if port == 465:
            security = "ssl"
        elif use_tls:
            security = "starttls"
        else:
            security = "none"
    elif port == 465 and security == "starttls":
        security = "ssl"

    return {
        "host": os.environ.get("SMTP_HOST", "").strip(),
        "port": port,
        "username": os.environ.get("SMTP_USERNAME", "").strip(),
        "password": os.environ.get("SMTP_PASSWORD", "").strip(),
        "from_email": os.environ.get("SMTP_FROM", os.environ.get("SMTP_USERNAME", "")).strip(),
        "security": security,
    }


def smtp_is_configured():
    settings = get_smtp_settings()
    return all(settings[key] for key in ("host", "username", "password", "from_email"))


def get_email_provider():
    return os.environ.get("EMAIL_PROVIDER", "auto").strip().lower()


def resend_is_configured():
    return bool(os.environ.get("RESEND_API_KEY", "").strip())


def get_resend_from_email():
    return (
        os.environ.get("RESEND_FROM", "").strip()
        or os.environ.get("SMTP_FROM", "").strip()
        or os.environ.get("SMTP_USERNAME", "").strip()
    )


def send_email_with_resend(to_email, subject, body):
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    from_email = get_resend_from_email()

    if not api_key or not from_email:
        raise RuntimeError("Resend email is not configured. Add RESEND_API_KEY and RESEND_FROM in Render.")

    request_body = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "text": body,
    }
    try:
        response = requests.post(
            "https://api.resend.com/emails",
            json=request_body,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json",
                "User-Agent": "AarushLab/1.0 (+https://aarush-dechu-website.onrender.com)",
            },
            timeout=SMTP_TIMEOUT_SECONDS,
        )
    except requests.RequestException as error:
        detail = f"{error.__class__.__name__}: {error}"
        raise RuntimeError(f"Could not reach the Resend email API over HTTPS. Details: {detail}") from error

    if response.ok:
        return

    try:
        provider_error = response.json()
        message = provider_error.get("message") or provider_error.get("error") or response.text
    except (ValueError, AttributeError):
        message = response.text

    message = str(message).strip() or "No error details were returned."
    if response.status_code in (400, 404, 422):
        raise ValueError(f"That email could not be sent. Resend said: {message}")
    if response.status_code in (401, 403):
        raise RuntimeError(
            "Resend rejected the email service credentials or sender address. "
            "Check RESEND_API_KEY and make sure RESEND_FROM uses a verified Resend domain. "
            f"Details: {message}"
        )
    if response.status_code == 429:
        raise RuntimeError("Too many verification emails were requested. Wait a minute and try again.")
    raise RuntimeError(f"Resend email failed with HTTP {response.status_code}: {message}")


def send_email_with_smtp(to_email, subject, body):
    if not smtp_is_configured():
        raise RuntimeError(
            "Email sending is not configured yet. Add SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM in Render."
        )

    settings = get_smtp_settings()
    message = EmailMessage()
    message["From"] = settings["from_email"]
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        if settings["security"] == "ssl":
            smtp_class = smtplib.SMTP_SSL
        else:
            smtp_class = smtplib.SMTP

        with smtp_class(settings["host"], settings["port"], timeout=SMTP_TIMEOUT_SECONDS) as server:
            if settings["security"] == "starttls":
                server.ehlo()
                server.starttls()
                server.ehlo()
            server.login(settings["username"], settings["password"])
            refused = server.send_message(message)
    except smtplib.SMTPRecipientsRefused as error:
        raise ValueError("That email address could not receive mail, so it looks invalid.") from error
    except smtplib.SMTPDataError as error:
        if 500 <= error.smtp_code < 600:
            raise ValueError("That email address could not receive mail, so it looks invalid.") from error
        raise RuntimeError("The email server rejected the message. Try again later.") from error
    except smtplib.SMTPAuthenticationError as error:
        raise RuntimeError("Email sending is not configured correctly. Check the SMTP username/password.") from error
    except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, TimeoutError, OSError) as error:
        detail = f"{error.__class__.__name__}: {error}"
        raise RuntimeError(
            "Could not reach the email server. For Gmail, set SMTP_HOST=smtp.gmail.com, "
            "SMTP_PORT=587, SMTP_SECURITY=starttls, and use a Gmail app password. "
            f"Details: {detail}"
        ) from error
    except smtplib.SMTPException as error:
        detail = f"{error.__class__.__name__}: {error}"
        raise RuntimeError(f"Email sending failed. Check the SMTP settings and try again. Details: {detail}") from error

    if refused:
        raise ValueError("That email address could not receive mail, so it looks invalid.")


def send_email(to_email, subject, body):
    provider = get_email_provider()

    if provider == "resend" or (provider == "auto" and resend_is_configured()):
        try:
            send_email_with_resend(to_email, subject, body)
            return
        except RuntimeError:
            if provider != "auto" or not smtp_is_configured():
                raise

    send_email_with_smtp(to_email, subject, body)


def hash_password(password, salt=None):
    raw_salt = salt or secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        str(password).encode("utf-8"),
        raw_salt,
        PASSWORD_ITERATIONS,
    )
    return encode_base64url(raw_salt), encode_base64url(password_hash)


def verify_password(password, salt_text, hash_text):
    try:
        raw_salt = decode_base64url(salt_text)
        expected_hash = decode_base64url(hash_text)
    except Exception:
        return False

    _, supplied_hash_text = hash_password(password, raw_salt)
    supplied_hash = decode_base64url(supplied_hash_text)
    return hmac.compare_digest(expected_hash, supplied_hash)


def get_user(username):
    normalized = normalize_username(username)
    if not normalized:
        return None

    with sqlite3.connect(USERS_DB_PATH) as connection:
        connection.row_factory = sqlite3.Row
        return connection.execute(
            """
            SELECT username, full_name, delivery_address, google_sub, password_salt, password_hash
            FROM users
            WHERE username = ?
            """,
            (normalized,),
        ).fetchone()


def get_user_by_google_sub(google_sub):
    if not google_sub:
        return None

    with sqlite3.connect(USERS_DB_PATH) as connection:
        connection.row_factory = sqlite3.Row
        return connection.execute(
            """
            SELECT username, full_name, delivery_address, google_sub, password_salt, password_hash
            FROM users
            WHERE google_sub = ?
            """,
            (str(google_sub),),
        ).fetchone()


def create_user(username, password, full_name, delivery_address):
    normalized = normalize_username(username)
    salt_text, hash_text = hash_password(password)
    with sqlite3.connect(USERS_DB_PATH) as connection:
        connection.execute(
            """
            INSERT INTO users (username, full_name, delivery_address, password_salt, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (normalized, full_name, delivery_address, salt_text, hash_text, int(time.time())),
        )


def create_google_user(email, display_name, google_sub):
    normalized = normalize_username(email)
    salt_text, hash_text = hash_password(secrets.token_urlsafe(32))
    with sqlite3.connect(USERS_DB_PATH) as connection:
        connection.execute(
            """
            INSERT INTO users (username, full_name, delivery_address, google_sub, password_salt, password_hash, created_at)
            VALUES (?, ?, '', ?, ?, ?, ?)
            """,
            (normalized, clean_text(display_name), str(google_sub), salt_text, hash_text, int(time.time())),
        )


def link_google_user(email, display_name, google_sub):
    normalized = normalize_username(email)
    with sqlite3.connect(USERS_DB_PATH) as connection:
        cursor = connection.execute(
            """
            UPDATE users
            SET google_sub = ?,
                full_name = CASE WHEN full_name = '' THEN ? ELSE full_name END
            WHERE username = ? AND google_sub = ''
            """,
            (str(google_sub), clean_text(display_name), normalized),
        )
        return cursor.rowcount > 0


def find_or_create_google_user(email, display_name, google_sub):
    google_user = get_user_by_google_sub(google_sub)
    if google_user:
        return google_user["username"]

    existing_user = get_user(email)
    if existing_user:
        if not existing_user["google_sub"]:
            link_google_user(email, display_name, google_sub)
        return existing_user["username"]

    create_google_user(email, display_name, google_sub)
    return normalize_username(email)


def update_user_password(username, password):
    normalized = normalize_username(username)
    salt_text, hash_text = hash_password(password)
    with sqlite3.connect(USERS_DB_PATH) as connection:
        cursor = connection.execute(
            """
            UPDATE users
            SET password_salt = ?, password_hash = ?
            WHERE username = ?
            """,
            (salt_text, hash_text, normalized),
        )
        return cursor.rowcount > 0


def make_six_digit_code():
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_short_code(code):
    secret = get_session_secret()
    if not secret:
        return ""

    return hmac.new(secret.encode("utf-8"), str(code).encode("utf-8"), hashlib.sha256).hexdigest()


def cleanup_code_store(store):
    now = time.time()
    expired_users = [
        username for username, record in store.items()
        if record["expires"] < now
    ]
    for username in expired_users:
        store.pop(username, None)


def create_password_reset_code(username):
    normalized = normalize_username(username)
    code = make_six_digit_code()
    password_reset_codes[normalized] = {
        "hash": hash_short_code(code),
        "expires": time.time() + RESET_CODE_SECONDS,
    }
    return code


def consume_password_reset_code(username, code):
    cleanup_code_store(password_reset_codes)
    normalized = normalize_username(username)
    record = password_reset_codes.get(normalized)
    if not record:
        return False

    supplied_hash = hash_short_code(code)
    if not supplied_hash or not hmac.compare_digest(record["hash"], supplied_hash):
        return False

    password_reset_codes.pop(normalized, None)
    return True


def create_email_verification_code(email):
    normalized = normalize_username(email)
    code = make_six_digit_code()
    email_verification_codes[normalized] = {
        "hash": hash_short_code(code),
        "expires": time.time() + RESET_CODE_SECONDS,
    }
    return code


def consume_email_verification_code(email, code):
    cleanup_code_store(email_verification_codes)
    normalized = normalize_username(email)
    record = email_verification_codes.get(normalized)
    if not record:
        return False

    supplied_hash = hash_short_code(code)
    if not supplied_hash or not hmac.compare_digest(record["hash"], supplied_hash):
        return False

    email_verification_codes.pop(normalized, None)
    return True


def authenticate_user(username, password):
    normalized = normalize_username(username)
    user = get_user(normalized)
    if user and verify_password(password, user["password_salt"], user["password_hash"]):
        return user["username"]

    expected_username = normalize_username(os.environ.get("LOGIN_USERNAME", ""))
    expected_password = os.environ.get("LOGIN_PASSWORD", "")
    if expected_username and expected_password:
        username_matches = hmac.compare_digest(normalized, expected_username)
        password_matches = hmac.compare_digest(str(password), expected_password)
        if username_matches and password_matches:
            return expected_username

    return None


def verify_google_credential(credential):
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    if not client_id:
        raise ValueError("Missing GOOGLE_CLIENT_ID environment variable.")

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError as error:
        raise ValueError("Missing Google sign-in packages. Run pip install -r requirements.txt and redeploy.") from error

    idinfo = id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)
    issuer = idinfo.get("iss")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise ValueError("Google token has an invalid issuer.")
    if idinfo.get("aud") != client_id:
        raise ValueError("Google token was not issued for this site.")
    if not idinfo.get("email_verified"):
        raise ValueError("Google account email is not verified.")

    email = normalize_username(idinfo.get("email", ""))
    if not is_valid_email(email):
        raise ValueError("Google did not return a valid email address.")

    return {
        "email": email,
        "displayName": clean_text(idinfo.get("name", "")) or email.split("@", 1)[0],
        "googleSub": str(idinfo.get("sub", "")),
    }


class SiteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.extra_headers = []
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        for key, value in self.extra_headers:
            self.send_header(key, value)
        super().end_headers()

    def do_GET(self):
        if self.request_path == "/api/stats":
            self.send_json(read_stats())
            return

        if self.request_path == "/api/auth-config":
            self.send_json(
                {
                    "googleClientId": os.environ.get("GOOGLE_CLIENT_ID", ""),
                }
            )
            return

        if self.request_path == "/api/session":
            username = self.current_user()
            if username:
                self.send_json(public_user_payload(username))
                return

            self.send_json({"authenticated": False, "username": None})
            return

        if self.should_count_visit():
            self.track_human_visit()

        super().do_GET()

    def do_POST(self):
        if self.request_path == "/api/signup":
            self.handle_signup()
            return

        if self.request_path == "/api/login":
            self.handle_login()
            return

        if self.request_path == "/api/google-login":
            self.handle_google_login()
            return

        if self.request_path == "/api/request-email-verification":
            self.handle_request_email_verification()
            return

        if self.request_path == "/api/request-password-reset":
            self.handle_request_password_reset()
            return

        if self.request_path == "/api/reset-password":
            self.handle_reset_password()
            return

        if self.request_path == "/api/order-request":
            self.handle_order_request()
            return

        if self.request_path == "/api/logout":
            self.send_json(
                {
                    "authenticated": False,
                    "username": None,
                },
                headers={"Set-Cookie": build_session_cookie("", max_age=0)},
            )
            return

        if self.request_path == "/api/quadratic":
            self.handle_quadratic()
            return

        self.send_error(404, "Not found")

    @property
    def request_path(self):
        return self.path.split("?", 1)[0]

    def should_count_visit(self):
        path = self.request_path
        if path in ("/", "/index.html"):
            return True

        return path in {
            "/about.html",
            "/gallery.html",
            "/login.html",
            "/math.html",
            "/product.html",
            "/shop.html",
        }

    def track_human_visit(self):
        increment_stat("visits")

        if is_probably_bot(self.headers.get("User-Agent", "")):
            return

        cookie = SimpleCookie(self.headers.get("Cookie", ""))
        if cookie.get(VISITOR_COOKIE_NAME):
            return

        visitor_id = secrets.token_urlsafe(18)
        self.extra_headers.append(("Set-Cookie", build_visitor_cookie(visitor_id)))
        increment_stat("uniqueVisitors")

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(length) or b"{}")

    def current_user(self):
        authorization = self.headers.get("Authorization", "")
        if authorization.startswith("Bearer "):
            user = verify_session_token(authorization.removeprefix("Bearer ").strip())
            if user:
                return user

        cookie = SimpleCookie(self.headers.get("Cookie", ""))
        session = cookie.get(SESSION_COOKIE_NAME)
        if not session:
            return None

        return verify_session_token(session.value)

    def handle_login(self):
        try:
            payload = self.read_json()
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, 400)
            return

        if not get_session_secret():
            self.send_json({"error": "Missing SESSION_SECRET environment variable."}, 500)
            return

        username = normalize_username(payload.get("username", ""))
        password = str(payload.get("password", ""))

        if not is_valid_email(username):
            self.send_json({"error": "Enter an email like someone@example.com."}, 400)
            return

        authenticated_username = authenticate_user(username, password)

        if not authenticated_username:
            if not get_user(username):
                self.send_json({"error": "No account found for that email."}, 404)
                return

            self.send_json({"error": "The password is incorrect."}, 401)
            return

        token = create_session_token(authenticated_username)
        self.send_json(
            auth_response_payload(authenticated_username, token),
            headers={"Set-Cookie": build_session_cookie(token)},
        )

    def handle_google_login(self):
        try:
            payload = self.read_json()
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, 400)
            return

        if not get_session_secret():
            self.send_json({"error": "Missing SESSION_SECRET environment variable."}, 500)
            return

        credential = str(payload.get("credential", ""))
        if not credential:
            self.send_json({"error": "Missing Google credential."}, 400)
            return

        try:
            google_profile = verify_google_credential(credential)
            username = find_or_create_google_user(
                google_profile["email"],
                google_profile["displayName"],
                google_profile["googleSub"],
            )
        except ValueError as error:
            self.send_json({"error": str(error)}, 401)
            return
        except Exception as error:
            self.send_json({"error": f"Google sign-in failed: {error}"}, 500)
            return

        token = create_session_token(username)
        self.send_json(
            auth_response_payload(username, token),
            headers={"Set-Cookie": build_session_cookie(token)},
        )

    def handle_signup(self):
        try:
            payload = self.read_json()
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, 400)
            return

        if not get_session_secret():
            self.send_json({"error": "Missing SESSION_SECRET environment variable."}, 500)
            return

        username = normalize_username(payload.get("username", "") or payload.get("email", ""))
        password = str(payload.get("password", ""))
        display_name = clean_text(payload.get("displayName", "") or payload.get("fullName", ""))
        verification_code = str(payload.get("emailCode", "") or payload.get("verificationCode", ""))

        if not is_valid_email(username):
            self.send_json({"error": "Enter an email like someone@example.com."}, 400)
            return

        if len(display_name) < 2:
            self.send_json({"error": "Enter a username with at least 2 characters."}, 400)
            return

        password_error = validate_password_policy(password)
        if password_error:
            self.send_json({"error": password_error}, 400)
            return

        if not consume_email_verification_code(username, verification_code):
            self.send_json({"error": "The email verification code is wrong or expired."}, 401)
            return

        try:
            create_user(username, password, display_name, "")
        except sqlite3.IntegrityError:
            self.send_json({"error": "That account already exists. Try logging in instead."}, 409)
            return

        token = create_session_token(username)
        self.send_json(
            auth_response_payload(username, token),
            201,
            headers={"Set-Cookie": build_session_cookie(token)},
        )

    def handle_request_email_verification(self):
        try:
            payload = self.read_json()
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, 400)
            return

        if not get_session_secret():
            self.send_json({"error": "Missing SESSION_SECRET environment variable."}, 500)
            return

        email = normalize_username(payload.get("email", "") or payload.get("username", ""))
        if not is_valid_email(email):
            self.send_json({"error": "Enter an email like someone@example.com."}, 400)
            return

        if get_user(email):
            self.send_json({"error": "That email already has an account. Try logging in."}, 409)
            return

        code = create_email_verification_code(email)
        try:
            send_email(
                email,
                "Your Aarush Lab verification code",
                (
                    f"Your Aarush Lab verification code is {code}.\n\n"
                    f"It expires in {RESET_CODE_SECONDS // 60} minutes."
                ),
            )
        except ValueError as error:
            email_verification_codes.pop(email, None)
            self.send_json({"error": str(error)}, 400)
            return
        except RuntimeError as error:
            email_verification_codes.pop(email, None)
            self.send_json({"error": str(error)}, 500)
            return

        self.send_json({"ok": True, "message": "Verification code sent. Check your email."})

    def handle_request_password_reset(self):
        try:
            payload = self.read_json()
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, 400)
            return

        if not get_session_secret():
            self.send_json({"error": "Missing SESSION_SECRET environment variable."}, 500)
            return

        username = normalize_username(payload.get("username", "") or payload.get("email", ""))
        if not is_valid_email(username):
            self.send_json({"error": "Enter an email like someone@example.com."}, 400)
            return

        if not get_user(username):
            self.send_json({"error": "No account found for that email."}, 404)
            return

        code = create_password_reset_code(username)
        try:
            send_email(
                username,
                "Your Aarush Lab password reset code",
                (
                    f"Your Aarush Lab password reset code is {code}.\n\n"
                    f"It expires in {RESET_CODE_SECONDS // 60} minutes."
                ),
            )
        except ValueError as error:
            password_reset_codes.pop(username, None)
            self.send_json({"error": str(error)}, 400)
            return
        except RuntimeError as error:
            password_reset_codes.pop(username, None)
            self.send_json({"error": str(error)}, 500)
            return

        self.send_json({"ok": True, "message": "Password reset code sent. Check your email."})

    def handle_reset_password(self):
        try:
            payload = self.read_json()
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, 400)
            return

        if not get_session_secret():
            self.send_json({"error": "Missing SESSION_SECRET environment variable."}, 500)
            return

        username = normalize_username(payload.get("username", "") or payload.get("email", ""))
        supplied_code = str(payload.get("resetCode", ""))
        new_password = str(payload.get("password", ""))

        if not is_valid_email(username):
            self.send_json({"error": "Enter an email like someone@example.com."}, 400)
            return

        if not consume_password_reset_code(username, supplied_code):
            self.send_json({"error": "Incorrect or expired reset code."}, 401)
            return

        password_error = validate_password_policy(new_password)
        if password_error:
            self.send_json({"error": password_error}, 400)
            return

        if not update_user_password(username, new_password):
            self.send_json({"error": "No account found for that email."}, 404)
            return

        self.send_json({"ok": True, "message": "Password updated. You can log in now."})

    def handle_order_request(self):
        try:
            payload = self.read_json()
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, 400)
            return

        items = payload.get("items") or []
        if not isinstance(items, list) or not items:
            self.send_json({"error": "Add at least one item to the cart first."}, 400)
            return

        total_quantity = 0
        for item in items:
            if not isinstance(item, dict):
                continue
            try:
                quantity = int(item.get("quantity", 1))
            except (TypeError, ValueError):
                quantity = 1
            total_quantity += max(1, quantity)

        if total_quantity <= 0:
            self.send_json({"error": "Add at least one item to the cart first."}, 400)
            return

        stats = increment_stat("productsSold", total_quantity)
        self.send_json(
            {
                "ok": True,
                "message": "Order request saved. Your cart stats updated.",
                "stats": stats,
            }
        )

    def handle_quadratic(self):
        global last_request_time

        if not self.current_user():
            self.send_json({"error": "Please log in or sign up to use Quadratic."}, 401)
            return

        now = time.time()
        while request_times and now - request_times[0] > REQUEST_WINDOW_SECONDS:
            request_times.popleft()

        if len(request_times) >= MAX_REQUESTS_PER_WINDOW:
            self.send_json(
                {
                    "error": (
                        "Server capacity reached. The free Gemini tier allows about "
                        "15 requests per minute. Please wait 30 seconds and try again."
                    )
                },
                429,
            )
            return

        seconds_since_last_request = now - last_request_time
        if seconds_since_last_request < COOLDOWN_SECONDS:
            self.send_json(
                {
                    "error": (
                        f"Quadratic is cooling down. Please wait "
                        f"{COOLDOWN_SECONDS - seconds_since_last_request:.1f} more seconds."
                    )
                },
                429,
            )
            return

        try:
            payload = self.read_json()
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, 400)
            return

        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key or api_key == "PASTE_YOUR_GEMINI_API_KEY_HERE":
            self.send_json({"error": "Missing GEMINI_API_KEY in .env"}, 500)
            return

        model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        system_prompt = payload.get("systemPrompt") or "You are Quadratic, a patient math tutor."
        request_body = {
            "systemInstruction": {
                "parts": [
                    {
                        "text": system_prompt
                    }
                ]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": build_tutor_input(payload)
                        }
                    ],
                }
            ],
            "generationConfig": {
                "maxOutputTokens": MAX_OUTPUT_TOKENS,
                "temperature": 0.35,
                "thinkingConfig": {
                    "thinkingBudget": 256
                },
            },
        }

        request = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
            data=json.dumps(request_body).encode("utf-8"),
            headers={
                "Content-Type": "application/json"
            },
            method="POST",
        )

        try:
            request_times.append(time.time())
            last_request_time = time.time()
            with urllib.request.urlopen(request, timeout=45) as response:
                data = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            message = error.read().decode("utf-8", "replace")
            if error.code == 429 or "ResourceExhausted" in message:
                self.send_json(
                    {
                        "error": (
                            "Server capacity reached. The Gemini free tier is rate-limited. "
                            "Please wait 30 seconds before submitting again."
                        )
                    },
                    429,
                )
                return

            self.send_json({"error": f"Gemini HTTP {error.code}: {message}"}, error.code)
            return
        except Exception as error:
            self.send_json({"error": str(error)}, 500)
            return

        stats = increment_stat("quadraticMessages")
        self.send_json({"answer": extract_gemini_text(data), "raw": data, "stats": stats})

    def send_json(self, payload, status=200, headers=None):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        if headers:
            for key, value in headers.items():
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)


def extract_gemini_text(data):
    if data.get("output_text"):
        return data["output_text"]

    text_parts = []
    for step in data.get("steps", []):
        for content in step.get("content", []):
            if content.get("type") == "text" and content.get("text"):
                text_parts.append(content["text"])

    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            if part.get("text"):
                text_parts.append(part["text"])

    return "\n".join(text_parts).strip()


if __name__ == "__main__":
    init_user_db()
    mimetypes.add_type("text/javascript", ".js")
    server = ThreadingHTTPServer((HOST, PORT), SiteHandler)
    print(f"Serving Aarush Lab on {HOST}:{PORT}")
    print("Quadratic backend is available at /api/quadratic")
    print("Login API is available at /api/login")
    print(f"Using Gemini model: {os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')}")
    server.serve_forever()
