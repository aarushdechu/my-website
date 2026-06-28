import json
import mimetypes
import os
import time
import urllib.error
import urllib.request
from collections import deque
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8001"))
REQUEST_WINDOW_SECONDS = 60
MAX_REQUESTS_PER_WINDOW = int(os.environ.get("GEMINI_RPM_LIMIT", "15"))
COOLDOWN_SECONDS = float(os.environ.get("QUADRATIC_COOLDOWN_SECONDS", "1"))
MAX_HISTORY_MESSAGES = int(os.environ.get("QUADRATIC_HISTORY_MESSAGES", "6"))
MAX_OUTPUT_TOKENS = int(os.environ.get("GEMINI_MAX_OUTPUT_TOKENS", "900"))
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
            "Respond as Quadratic. If Aarush gave a preferred method, use it. Teach slowly with explanations, not just an answer.",
        ]
    )


class SiteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        global last_request_time

        if self.path != "/api/quadratic":
            self.send_error(404, "Not found")
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

        length = int(self.headers.get("Content-Length", "0"))
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
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
            "model": model,
            "system_instruction": system_prompt,
            "input": build_tutor_input(payload),
            "generation_config": {
                "max_output_tokens": MAX_OUTPUT_TOKENS,
                "temperature": 0.35,
            },
        }

        request = urllib.request.Request(
            "https://generativelanguage.googleapis.com/v1beta/interactions",
            data=json.dumps(request_body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
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

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
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
    mimetypes.add_type("text/javascript", ".js")
    server = ThreadingHTTPServer(("127.0.0.1", PORT), SiteHandler)
    print(f"Serving Aarush Lab at http://127.0.0.1:{PORT}/")
    print("Quadratic backend is available at /api/quadratic")
    print(f"Using Gemini model: {os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')}")
    server.serve_forever()
