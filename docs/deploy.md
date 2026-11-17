# Putting GOTRAJET online

The site, API and admin run as **one container** (see the `Dockerfile`) next to a **PostgreSQL database**.
Buying the domain and the hosting needs your company's payment details, so these steps are for you (or your developer) to do.

## 1. Domain

- `gotrajet.ma`: buy it from a registrar accredited by the ANRT (the `.ma` registry). A `.ma` domain is usually reserved to Moroccan companies or residents, so have the company documents ready.
- Also take `gotrajet.com` if it is free, and redirect it to `.ma`.
- You will add two DNS records later: `gotrajet.ma` and `www.gotrajet.ma` pointing to the host.

## 2. Hosting (pick one)

| Option | Good for | Notes |
| --- | --- | --- |
| **Managed platform** (Render, Railway, Fly.io, Scaleway…) | Easiest start | Deploy from the `Dockerfile`, add a managed PostgreSQL, HTTPS is automatic. |
| **VPS** (OVHcloud, Hetzner, Scaleway, or a Moroccan host) | Lowest cost, full control | Install Docker + a reverse proxy (Caddy gives HTTPS automatically). You manage updates and backups. |
| **Hosting in Morocco** | If the CNDP or a partner requires data to stay in Morocco | Ask your lawyer; it affects the choice above. |

The current `.openai/hosting.json` is for static hosting only: it can show the **demo**, not run the backend.

## 3. Production settings (`backend/.env` or the host's "environment variables")

```
ENV=prod
SECRET_KEY=<python -c "import secrets; print(secrets.token_urlsafe(48))">
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/gotrajet
PUBLIC_URL=https://gotrajet.ma
ADMIN_EMAIL=<your work email>
ADMIN_PASSWORD=<long unique password; change it after first login>
PAYMENT_MODE=live
CASH_WEBHOOK_SECRET=<shared with the agency network>
SMS_PROVIDER=twilio            # or wati
UPLOAD_DIR=/app/backend/data/uploads   # on a persistent disk, or move to private object storage
```

With `ENV=prod` the server refuses to start without `SECRET_KEY` or with sandbox payments, hides the API docs, marks cookies `Secure`, sends HSTS and creates no test accounts.

## 4. Before opening to the public

- [ ] HTTPS works on `gotrajet.ma` and `www`.
- [ ] Daily database backups, and one restore actually tested.
- [ ] Identity documents on a persistent, private, backed-up disk (or private object storage).
- [ ] Admin password changed; one admin account per team member.
- [ ] Real SMS provider tested on Maroc Telecom, Orange and inwi numbers.
- [ ] Cash agency webhook tested with the agency in their test environment.
- [ ] Terms, privacy policy and prohibited-items list reviewed by a lawyer; CNDP declaration filed.
- [ ] `python -m pytest backend/tests` passes on the production build.
- [ ] Uptime monitoring and error alerts (e.g. a free uptime checker + the host's logs).
- [ ] When the schema changes after launch: add Alembic migrations (today tables are created automatically on start).
