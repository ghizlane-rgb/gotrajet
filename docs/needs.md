# GOTRAJET — Needs

What the project needs to go from today's **demo** to a **real service** with real customers.

Today everything runs in the browser and is saved on the visitor's device (localStorage). Accounts, payments, messages, tracking and insurance are **simulated**.

Priority:
- **P0** — blocking for launch
- **P1** — needed soon after launch
- **P2** — important, not blocking

---

## 1. Running and testing it locally (already works)

| Need | Detail |
| --- | --- |
| Python 3 | Local server: `python -m http.server 4173 --bind 127.0.0.1 --directory dist`, then open http://127.0.0.1:4173 |
| Python Playwright + Chromium | Browser tests: `python tests/browser_checks.py` |
| Pillow, fontTools, brotli | Only to regenerate assets: `python scripts/optimize_assets.py` |
| Internet connection | Only for Google Maps; the rest of the site works offline |

## 2. Accounts and identity

| Pri. | Need | Why |
| --- | --- | --- |
| P0 | Backend + database (user accounts, trips, bookings, parcels, messages, reviews) | Today, data lives only in the visitor's browser and is not shared between users. |
| P0 | Real authentication: email + password with hashing, email verification, password reset | The current sign-in is a demo; passwords are neither stored nor checked. |
| P1 | Google / Apple / Facebook sign-in (OAuth) | The buttons exist but only simulate sign-in. |
| P0 | Traveller identity verification (ID card, phone number, optionally driving licence) | Trust is the core of the service. |
| P1 | Admin back-office: users, trips, disputes, reported content | Moderation and support. |

## 3. Money

| Pri. | Need | Why |
| --- | --- | --- |
| P0 | A payment provider available in Morocco (for example through CMI, the Moroccan interbank centre, or a licensed payment provider) | Card payments are simulated. |
| P0 | Escrow logic: the sender pays → money is held → released to the traveller after the handoff code is confirmed | Protects both sides. |
| P1 | Traveller payouts (bank transfer / mobile wallet) and refunds on cancellation | Today the wallet is fictional. |
| P1 | Invoices / receipts and accounting for the 7% service fee | Legal and tax obligations. |
| P1 | Insurance partner for the "optional insurance" | The option is displayed but covers nothing yet. |

## 4. Maps, tracking and messaging

| Pri. | Need | Why |
| --- | --- | --- |
| P0 | **Google Maps API key** restricted to the production domain, with the *Maps Embed API* enabled; paste it into `GOOGLE_MAPS_API_KEY` in `dist/js/app.js` (APIs and prices: section 5) | The keyless embed is fine for a demo, not guaranteed in production. |
| P1 | Live GPS tracking from the traveller's phone (with consent) | The parcel progress is illustrative today. |
| P1 | Address autocomplete / geocoding (Places API) | Addresses are free text. |
| P0 | Real-time chat between sender and traveller (WebSocket or a chat service) | Messages stay on the device today. |
| P1 | Push notifications, SMS and/or WhatsApp (a Wati reference PDF exists; nothing is configured) | Booking, departure and delivery alerts. |

## 5. Google Maps APIs and prices

Prices come from Google's official price list, checked on **11 November 2026**. They are in **US dollars (USD)**, standard global pricing; there is no special price for Morocco.

**How Google charges (since 1 March 2025):**
- Each API gets its own **free quota every month**: 10,000 calls for "Essentials", 5,000 for "Pro", 1,000 for "Enterprise".
- The old shared $200 monthly credit no longer exists.
- After the free quota, you pay **per 1,000 calls**. The price drops at higher volumes (100,000 / 500,000 / 1,000,000 / 5,000,000 calls).
- A Google Cloud **billing account (credit card)** is needed to create an API key, even if you stay inside the free quota.

### APIs GOTRAJET needs

| Pri. | API (Google SKU) | Used for in GOTRAJET | Free / month | Price after free quota (per 1,000) |
| --- | --- | --- | --- | --- |
| P0 | **Maps Embed API** (all modes) | The maps already on the site: routes on results, trip detail, tracking, publish preview, addresses, "Across Morocco" | **Unlimited** | **Free** |
| P1 | **Maps JavaScript API** (Dynamic Maps) | Interactive map with our own markers: live traveller position, parcel pickup/drop-off pins | 10,000 map loads | $7.00 → $5.60 (100k+) → $4.20 (500k+) |
| P1 | **Places Autocomplete** (Autocomplete Session Usage) | Address suggestions while typing in the parcel form and saved addresses | **Unlimited** (session usage) | Free when the session ends with a Place Details call |
| P1 | **Places API, Place Details Essentials** | Get the exact address and GPS point after the user picks a suggestion | 10,000 | $5.00 → $4.00 → $3.00 |
| P1 | **Routes API, Compute Routes Essentials** | Distance and duration of a trip → suggested price, CO₂ saved, arrival estimate | 10,000 | $5.00 → $4.00 → $3.00 |
| P2 | **Routes API, Compute Routes Pro** | Only if needed: advanced routing options (e.g. traffic-aware routes, many stops) for along-the-way matching | 5,000 | $10.00 → $8.00 → $6.00 |
| P2 | **Routes API, Compute Route Matrix Essentials** | Compare many trips at once (which travellers pass near a pickup point) | 10,000 elements | $5.00 → $4.00 → $3.00 |
| P2 | **Geocoding API** | Turn a typed address into GPS coordinates (when not using Autocomplete) | 10,000 | $5.00 → $4.00 → $3.00 |
| P2 | **Maps Static API** | Small map image in confirmation emails and PDF receipts | 10,000 | $2.00 → $1.60 → $1.20 |
| — | Autocomplete Requests (without sessions) | Avoid: use session-based autocomplete instead | 10,000 | $2.83 |
| — | Places Text Search Pro | Avoid: expensive and not needed | 5,000 | $32.00 |

### Cost estimates

Assumptions: 2 addresses per parcel request, 5 tracking-map views per parcel, distances cached per city pair (see below).

| Scenario | Usage per month | Estimated Google bill |
| --- | --- | --- |
| **Today (demo)** | Embed API only | **$0** |
| **Launch:** about 3,000 parcels / month | Embed (free) · 15,000 dynamic map loads · 6,000 Place Details · routes cached | 5,000 × $7 / 1,000 = **≈ $35 / month** |
| **Growth:** about 30,000 parcels / month | 150,000 dynamic map loads · 60,000 Place Details · routes cached | Maps: 90,000 × $7 + 50,000 × $5.60 = $910 · Place Details: 50,000 × $5 = $250 → **≈ $1,160 / month** |

These are estimates; the real bill depends on traffic. Use Google's pricing calculator before launch.

### How to keep the bill low

- **Keep the Embed API wherever a simple map is enough.** It is free and unlimited, and it is what the site uses today.
- **Cache distances and durations per city pair** in the database. With 8 cities there are only 56 pairs, so Routes API calls stay almost at zero.
- **Use session-based Autocomplete** (one session per address field), never plain Autocomplete Requests.
- Request only the fields you need from Places (stay in "Essentials", not "Pro").
- Load the dynamic map only on the tracking screen, and only when a trip is in progress.
- In Google Cloud:
  - set a **budget with email alerts** and **daily quotas** per API;
  - restrict the key to the production domain (HTTP referrers) and to the APIs listed above;
  - use separate keys for the website and for the backend.

### Setup steps

1. Create a Google Cloud project and a billing account.
2. Enable **Maps Embed API** (and later Maps JavaScript, Places, Routes).
3. Create an API key and restrict it (domain + APIs).
4. Put the key in `GOOGLE_MAPS_API_KEY` in `dist/js/app.js`. Later, keep backend keys on the server only.
5. Set budget alerts and quotas.

Sources: [Google Maps Platform pricing list](https://developers.google.com/maps/billing-and-pricing/pricing) · [Pricing overview (changes of 1 March 2025)](https://developers.google.com/maps/billing-and-pricing/overview)

## 6. Legal and compliance (Morocco)

| Pri. | Need | Why |
| --- | --- | --- |
| P0 | Real terms of service and privacy policy reviewed by a lawyer | Current texts say "demo". |
| P0 | Personal-data compliance with Moroccan law 09-08 (declaration / authorisation with the CNDP) | GOTRAJET processes identity, phone, address and location data. |
| P0 | List of prohibited items and liability rules (lost, damaged or illegal parcels) | Protects the company, senders and travellers. |
| P1 | Cookie / tracking consent banner if analytics are added | Privacy. |
| P1 | Company registration, invoicing details, legal notice page | Required for a commercial site. |

## 7. Hosting and operations

| Pri. | Need | Why |
| --- | --- | --- |
| P0 | Domain name (e.g. gotrajet.ma / .com) + HTTPS hosting | The site is local only. `.openai/hosting.json` exists but nothing is deployed. |
| P0 | Set absolute URLs for `og:image` and add `og:url` / canonical once the domain is known | Social previews need absolute links. |
| P1 | Backups, monitoring, error logging | Operations. |
| P1 | Security headers (Content-Security-Policy allowing `google.com` frames, HSTS) | Security. |
| P2 | Privacy-friendly analytics | Measure visits and conversions. |

## 8. Content and brand

| Pri. | Need | Why |
| --- | --- | --- |
| P1 | Final logo files (SVG) and brand guidelines | The current logo is a code recreation. |
| P1 | Real photos (travellers, handoffs, cities) with usage rights | The current photos are illustrative stock images. |
| P1 | Native-speaker review of the Arabic and English texts | Translations were written for the demo. |
| P2 | Real testimonials (with permission) to replace the demo reviews | They are labelled "demo" today. |
| P2 | Real statistics once there is activity (members, deliveries, CO₂ saved) | No numbers were invented. |

## 9. Team / skills

- Backend developer (API, database, payments, security)
- Mobile / front-end developer (this website, then mobile apps)
- Designer (brand, photos, illustrations)
- Legal advisor (terms, data protection, liability)
- Support / operations (verification, disputes)
