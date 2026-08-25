# Aarush's Website

A personal website with a portfolio, handmade shop, accounts, order requests, and
a Python backend.

## Start Locally

```bash
python3 server.py
```

Then open `http://localhost:8001`.

Private settings belong in `.env`. Start from `.env.example`; never commit `.env`.

## Common Edits

- Shop products: `js/shop-catalog.js`
- Shared behavior: `js/main.js`
- Site styling: `css/style.css`
- Page content: the HTML files in the project root
- Backend and APIs: `server.py`
- Product photos: `images/shop/`

## Check The Project

```bash
python3 tools/check_project.py
```

See [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md) for the full directory guide and
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Render, Google login, email, and data
storage setup.
