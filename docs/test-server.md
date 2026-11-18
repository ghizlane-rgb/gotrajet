# Shared test server for the team (Vercel)

One online address where the whole team uses **the same database**: an account, trip or parcel created by one person is seen by everyone. Everything is in **Vercel**: the website + API + admin run as a Vercel Function, and the data lives in a **Neon** PostgreSQL database created from Vercel's Storage tab.

> This is a **test** setup: payments are simulated, SMS codes are shown on screen, and test accounts are created automatically. Never put real customers, real ID documents or real money on it. For the real launch, see [deploy.md](deploy.md).

Files used by Vercel: [`pyproject.toml`](../pyproject.toml) (Python 3.13, packages, where the app is), [`vercel.json`](../vercel.json) (runs in Frankfurt, next to the database) and [`.vercelignore`](../.vercelignore) (keeps `backend/.env`, local databases and the mobile build off Vercel).

## Set it up (once, about 10 minutes)

Run the commands in PowerShell, in the `gotrajet` folder. Node.js is already installed (the mobile app uses it).

### 1. Create the Vercel project

```powershell
npx vercel@latest login     # sign in (free Hobby account) in the browser
npx vercel@latest link      # "Set up and link?" Yes → your account → "Link to existing project?" No → name: gotrajet-test
```

### 2. Add the database (Neon, inside Vercel)

1. Open <https://vercel.com/dashboard> → project **gotrajet-test** → **Storage** → **Create Database** → **Neon** → Continue.
2. Region **Frankfurt (eu-central-1)**, plan **Free**, name `gotrajet-test-db` → Create.
3. **Connect Project** → `gotrajet-test`, keep all environments ticked, leave **Custom Prefix empty** → Connect.
   This adds `DATABASE_URL` to the project automatically.

### 3. Choose the admin password

```powershell
npx vercel@latest env add ADMIN_PASSWORD production    # type a password for the admin panel
```

(Or in the dashboard: **Settings → Environment Variables**.) Nothing else is needed: the login key and the agency-webhook secret are derived from the database secret on Vercel.

### 4. Deploy

```powershell
npx vercel@latest deploy --prod
```

It prints the address, for example `https://gotrajet-test.vercel.app`. Check it: open `https://<address>/api/health` → `{"ok":true,"env":"dev","sandbox":true,…}`.

On the first visit the server creates the tables and the test accounts in Neon. To publish a change later, run `npx vercel@latest deploy --prod` again: **the data stays**.

Prefer GitHub? Push the project to a private repository and, in Vercel, **Add New → Project → Import** it; every push then redeploys. Steps 2 and 3 are the same.

## Message for the team

Send them this (replace the address and admin password):

> **GOTRAJET test**: https://gotrajet-test.vercel.app
>
> | Login | Password | Use |
> | --- | --- | --- |
> | sender.test@example.com | test1234 | Sender, 500 MAD test balance |
> | traveler.test@example.com | test1234 | Verified traveller with trips. Starts at 0 MAD: top up (test card, instant) before accepting a parcel, because the 100 MAD monthly subscription is taken from the balance |
> | youssef@example.com | test1234 | Verified traveller |
> | salma@example.com | test1234 | Verified traveller |
> | Admin panel: /admin/ · admin@gotrajet.test | (admin password) | Team back office |
>
> You can also create your own account. Everything is shared and fake: SMS codes appear on screen, payments are simulated, and the "simulate agency payment" button completes a cash top-up. Don't upload a real ID card.

## Mobile app on the test server

To make the Android app use the shared database instead of local demo data:

```powershell
cd "mobile application"
$env:GOTRAJET_SERVER_URL = "https://gotrajet-test.vercel.app"
npm run apk        # → build/GOTRAJET.apk, send it to the team
```

On iPhone, open the address in Safari → Share → *Add to Home Screen*.

## Good to know

| Topic | Detail |
| --- | --- |
| Uploaded files | Vercel has no permanent disk: ID photos uploaded on the test server disappear after a while, and the admin may not be able to open them. The seeded travellers are already verified, so use them to publish trips. |
| File size | Vercel accepts requests up to 4.5 MB, so keep test uploads under that. |
| First request | After a quiet period the first page takes a few seconds while Vercel and Neon wake up. |
| Start again from zero | Vercel → **Storage** → the database → **Open in Neon** → **SQL Editor**: run `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`, then `npx vercel@latest deploy --prod`. The tables and test accounts are created again. |
| Logs | Vercel → project → **Logs** (errors, and SMS codes as they are "sent"). |
| Settings | Vercel → **Settings → Environment Variables**; redeploy after a change. |
| Plan | Vercel's free Hobby plan is meant for personal, non-commercial use. For company work beyond a short test, Vercel expects the Pro plan. |
| Local runs | Unchanged: `python backend/run.py` still uses the local SQLite file. |
