import base64
import hashlib
import hmac
import json
import mimetypes
import os
import secrets
import sqlite3
import time
import urllib.error
import urllib.request
from collections import deque
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8001"))
HOST = os.environ.get("HOST", "0.0.0.0")
REQUEST_WINDOW_SECONDS = 60
MAX_REQUESTS_PER_WINDOW = int(os.environ.get("GEMINI_RPM_LIMIT", "15"))
COOLDOWN_SECONDS = float(os.environ.get("QUADRATIC_COOLDOWN_SECONDS", "1"))
MAX_HISTORY_MESSAGES = int(os.environ.get("QUADRATIC_HISTORY_MESSAGES", "6"))
MAX_OUTPUT_TOKENS = int(os.environ.get("GEMINI_MAX_OUTPUT_TOKENS", "900"))
SESSION_COOKIE_NAME = "aarush_session"
SESSION_SECONDS = int(os.environ.get("SESSION_SECONDS", str(7 * 24 * 60 * 60)))
PASSWORD_ITERATIONS = 210_000
USERS_DB_PATH = Path(os.environ.get("USERS_DB_PATH", "users.db"))
if not USERS_DB_PATH.is_absolute():
    USERS_DB_PATH = ROOT / USERS_DB_PATH
request_times = deque()
last_request_time = 0.0


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
    parts = [
        f"{SESSION_COOKIE_NAME}={value}",
        "Path=/",
        f"Max-Age={max_age}",
        "HttpOnly",
        "SameSite=Lax",
    ]

    if os.environ.get("COOKIE_SECURE", "").lower() == "true":
        parts.append("Secure")

    return "; ".join(parts)


def init_user_db():
    USERS_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(USERS_DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
            """
        )


def normalize_username(username):
    return str(username or "").strip().lower()


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
            "SELECT username, password_salt, password_hash FROM users WHERE username = ?",
            (normalized,),
        ).fetchone()


def create_user(username, password):
    normalized = normalize_username(username)
    salt_text, hash_text = hash_password(password)
    with sqlite3.connect(USERS_DB_PATH) as connection:
        connection.execute(
            """
            INSERT INTO users (username, password_salt, password_hash, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (normalized, salt_text, hash_text, int(time.time())),
        )


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


class SiteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.request_path == "/api/session":
            username = self.current_user()
            self.send_json(
                {
                    "authenticated": bool(username),
                    "username": username,
                }
            )
            return

        super().do_GET()

    def do_POST(self):
        if self.request_path == "/api/signup":
            self.handle_signup()
            return

        if self.request_path == "/api/login":
            self.handle_login()
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

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(length) or b"{}")

    def current_user(self):
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
        authenticated_username = authenticate_user(username, password)

        if not authenticated_username:
            self.send_json({"error": "Incorrect username or password."}, 401)
            return

        token = create_session_token(authenticated_username)
        self.send_json(
            {
                "authenticated": True,
                "username": authenticated_username,
            },
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

        username = normalize_username(payload.get("username", ""))
        password = str(payload.get("password", ""))

        if len(username) < 3 or " " in username:
            self.send_json({"error": "Use an email or username with at least 3 characters and no spaces."}, 400)
            return

        if len(password) < 8:
            self.send_json({"error": "Use a password with at least 8 characters."}, 400)
            return

        try:
            create_user(username, password)
        except sqlite3.IntegrityError:
            self.send_json({"error": "That account already exists. Try logging in instead."}, 409)
            return

        token = create_session_token(username)
        self.send_json(
            {
                "authenticated": True,
                "username": username,
            },
            201,
            headers={"Set-Cookie": build_session_cookie(token)},
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

        self.send_json({"answer": extract_gemini_text(data), "raw": data})

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
    load_dotenv()
    init_user_db()
    mimetypes.add_type("text/javascript", ".js")
    server = ThreadingHTTPServer((HOST, PORT), SiteHandler)
    print(f"Serving Aarush Lab on {HOST}:{PORT}")
    print("Quadratic backend is available at /api/quadratic")
    print("Login API is available at /api/login")
    print(f"Using Gemini model: {os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')}")
    server.serve_forever()
