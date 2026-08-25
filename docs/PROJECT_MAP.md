# Project Map

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Home page and site statistics |
| `shop.html` | Shop folder browser |
| `product.html` | Reusable product-detail page |
| `gallery.html` | Portfolio gallery |
| `about.html` | About Aarush |
| `login.html` | Login, signup, and password reset |
| `math.html` | Hidden Quadratic page retained for future use |

## Frontend

| Path | Purpose |
| --- | --- |
| `css/style.css` | All shared styling and responsive rules |
| `js/shop-catalog.js` | Product names, descriptions, images, and folders |
| `js/main.js` | Navigation, shop rendering, cart, accounts, and shared UI |
| `js/math-brain.js` | Quadratic's browser-side math behavior |
| `js/quadratic-config.js` | Safe public Quadratic settings; never store API keys here |

## Backend

`server.py` serves the website and owns all private/server-side work:

- login and signup
- Google authentication
- verification and reset emails
- order requests
- Gemini requests
- visitor and sales statistics

`requirements.txt` lists the Python packages Render installs.

## Assets

- `images/about/`: About-page photography
- `images/shop/`: Shop product photography
- Shop filenames use `origami-item-name.png`.

## Local-Only Data

These files are intentionally ignored by Git:

- `.env`: secrets and local environment settings
- `users.db`: local accounts
- `site-stats.json`: local counters

## Safe Editing Workflow

1. Make the content or code change.
2. Run `python3 tools/check_project.py`.
3. Start `python3 server.py` and inspect the affected page.
4. Commit only after the checks pass.
