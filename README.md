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
RESET_CODE_SECONDS=600
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-sending-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM=your-sending-email@gmail.com
SMTP_USE_TLS=true
```

On Render, add the same environment variables, but use `COOKIE_SECURE=true`.

For Google sign-in, create a Google OAuth web client, add your Render domain as an
authorized JavaScript origin, then set `GOOGLE_CLIENT_ID` in Render.

For email verification and password reset codes, configure SMTP. With Gmail, use a
Gmail app password, not your normal Google password.

Sign-up accounts are stored in SQLite. For local development, `USERS_DB_PATH=users.db`
is fine. On Render, use a persistent disk or hosted database if you want accounts to
survive service restarts and redeploys.
