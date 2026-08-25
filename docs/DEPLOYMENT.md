# Deployment

The production site runs as a Python web service on Render.

## Render Commands

```text
Build Command: pip install -r requirements.txt
Start Command: python3 server.py
Health Check Path: /
```

## Environment Variables

Copy the names from `.env.example` into Render. Use real private values in Render,
not the placeholders. Set `COOKIE_SECURE=true` in production.

### Google Login

Create a Google OAuth web client, add the Render domain as an authorized JavaScript
origin, and set `GOOGLE_CLIENT_ID` in Render.

### Verification Email

Resend is recommended on Render because it works over HTTPS:

```text
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-private-key
RESEND_FROM=Aarush Lab <noreply@your-verified-domain.com>
```

The sender domain must be verified in Resend. For an initial test,
`Aarush Lab <onboarding@resend.dev>` can send to the email address that owns the
Resend account. Sending to other users requires a verified domain.

Gmail SMTP remains available as a fallback. Use a Gmail app password, never the
normal Google account password.

## Persistent Data

Accounts use SQLite and statistics use JSON files. Attach a Render persistent disk
or move this data to a hosted database if it must survive every redeploy and service
replacement.
