# GOTRAJET backend

One server for the website (`/`), the API (`/api`) and the team's admin panel (`/admin`).
Python · FastAPI · SQLAlchemy · SQLite locally, PostgreSQL in production.

## Run it locally

```powershell
pip install -r backend/requirements.txt
python backend/run.py
```

| Address | What |
| --- | --- |
| http://127.0.0.1:8000 | The website, connected to the real database |
| http://127.0.0.1:8000/admin/ | Admin panel: `admin@gotrajet.test` / `admin-gotrajet` |
| http://127.0.0.1:8000/api/docs | Interactive API documentation (dev only) |

On an empty database, dev mode creates test accounts (password `test1234`):
`sender.test@example.com` (500 MAD balance) and `traveler.test@example.com` (verified, with trips), plus two other travellers.
Delete `backend/data/gotrajet.db` to start again from zero.

Dev mode does not send anything: SMS codes are printed in the server window **and** shown on screen, card and agency payments are simulated (`PAYMENT_MODE=sandbox`).

## Tests

```powershell
python -m pytest backend/tests -q        # API: accounts, escrow, cash webhook, disputes, payouts, security
python backend/run.py                    # then, in another window, on a fresh database:
python tests/server_e2e.py               # browser: sender and traveller complete a delivery
```

## What it does

| Area | Detail |
| --- | --- |
| Accounts | Sign-up, login (httpOnly session cookie, 7 days), scrypt password hashing, rate-limited login, reset by link, change password, log out everywhere. |
| Phone | 6-digit SMS code, 10 min, 5 attempts. Changing the number requires verifying again. |
| Identity | Traveller uploads ID + selfie (+ licence, vehicle papers). Files checked (JPG/PNG/WebP/PDF, 5 MB), stored privately, viewed only by admins. Publishing a trip requires phone + ID + selfie approved (`REQUIRE_VERIFIED_TRAVELER`). |
| Trips | Publish, search, start, finish, cancel. Unanswered requests are refunded when the trip starts or is cancelled. |
| Parcels | Booking checks seats, weight, and the prohibited-items confirmation. Traveller accepts / declines / picks up. The recipient gets the 4-digit code by SMS at pickup; the traveller types it to confirm delivery (5 tries). |
| Money (escrow) | Every movement is a ledger line in centimes. The sender pays on booking → money held → on delivery the traveller gets the price minus 10 %, the platform keeps 10 % + insurance. Decline/cancel = full refund to the wallet. A dispute freezes the money until an admin decides. |
| Traveller pricing | 100 MAD monthly subscription, taken from the balance at the first trip published or parcel accepted each month (balance too low → 402 `subscription_unpaid`, the traveller tops up by card or Cash Plus). Cancelling an **accepted** parcel costs the traveller 2 % of the transport price (free when the client cancels, or for a new request), max 30 per month. The traveller can file a claim; support refunds or rejects it in the admin **Réclamations** tab. Settings: `COMMISSION_RATE`, `TRAVELER_MONTHLY_FEE_MAD`, `TRAVELER_CANCEL_FEE_RATE`, `TRAVELER_MAX_CANCELS_PER_MONTH`. |
| Wallet | Cash top-up at Cash Plus / Wafacash / Barid Cash / Damane Cash (10-digit reference, 48 h, 20–5 000 MAD). Agencies call a signed webhook. Card top-up is sandbox only for now. Payouts: only earnings can be withdrawn; admins mark them paid. |
| Chat | Between people who share a parcel, and with support. The site refreshes every 10 s. |
| Notifications | In the app, and by SMS/WhatsApp for important steps (accepted, on the way, delivered, top-up, payout). |
| Admin | Overview, ID checks, disputes, payouts, parcels, users (suspend), cash top-ups, support tickets, audit log of every admin action. |

## Connecting real providers

| Provider | Setting | What is needed from you |
| --- | --- | --- |
| Cash agency (Cash Plus, Wafacash…) | `CASH_WEBHOOK_SECRET`, `PAYMENT_MODE=live` | A contract. Give them the spec at the top of `app/routers/wallet.py` (lookup + webhook, HMAC-SHA256 signature). |
| Card payments | not wired yet | Choose a provider (e.g. CMI or a licensed PSP), then add it where `card_provider_not_configured` is raised. |
| SMS | `SMS_PROVIDER=twilio` + `TWILIO_*` | An account and a sender number/name allowed in Morocco. |
| WhatsApp | `SMS_PROVIDER=wati` + `WATI_*` | A Wati account and templates approved by Meta: `gotrajet_otp`, `gotrajet_recipient`, `gotrajet_reset`, and one per notification. |

## Put it online

- Shared **test** server for the team (Vercel + Neon, `pyproject.toml` / `vercel.json`): [docs/test-server.md](../docs/test-server.md).
- Real launch: [docs/deploy.md](../docs/deploy.md).

`DATABASE_URL` accepts the `postgres://…` / `postgresql://…` strings that hosts give; they are switched to the installed psycopg 3 driver automatically. `python -m pytest backend/tests` runs on SQLite; set `TEST_DATABASE_URL` to an empty PostgreSQL database to run the same tests there.
