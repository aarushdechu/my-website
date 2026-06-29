# my-website
A website.... for ME!

## Local setup

Run the Python server from this folder:

```bash
python3 server.py
```

Create a local `.env` file for private values. Do not commit `.env`.

```bash
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.5-flash

LOGIN_USERNAME=aarush
LOGIN_PASSWORD=your-login-password
SESSION_SECRET=make-this-long-and-random
COOKIE_SECURE=false
USERS_DB_PATH=users.db
PASSWORD_RESET_CODE=private-reset-code-for-password-resets
```

On Render, add the same environment variables, but use `COOKIE_SECURE=true`.

Sign-up accounts are stored in SQLite. For local development, `USERS_DB_PATH=users.db`
is fine. On Render, use a persistent disk or hosted database if you want accounts to
survive service restarts and redeploys.
