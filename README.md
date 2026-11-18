# GOTRAJET

A responsive, international website for collaborative parcel delivery in Morocco: a public marketing site plus the full product (the distinct screens from the 18 supplied image references). French, English and Arabic (RTL), browser-language detection, light/dark themes, mobile bottom navigation, desktop sidebar, local photography and fonts, and the navy `#0b3052` / blue `#1762a1` / orange `#ff8616` / green `#19876c` visual identity.

**This is a browser-local UI demonstration, not a production transport service.** Authentication, social login, payments, wallet balances, delivery tracking, insurance and message delivery are explicitly simulated. No passwords, full card numbers or card security codes are stored.

## Run with the real backend (accounts, database, payments, admin)

```powershell
pip install -r backend/requirements.txt
python backend/run.py
```

Open http://127.0.0.1:8000 (website) and http://127.0.0.1:8000/admin/ (team panel). Test accounts, admin login, providers and deployment: [backend/README.md](backend/README.md) and [docs/deploy.md](docs/deploy.md). Served this way, the site uses real accounts and data (`js/server.js`); opened on its own, it stays the local demo described below.

**Shared test server for the team** (one online database for everyone, on Vercel with a Neon database): [docs/test-server.md](docs/test-server.md).

## Mobile application

The folder [mobile application/](mobile%20application/README.md) turns this website into a mobile app: an installable, offline web app (PWA) and a native Android / iOS app built with Capacitor. Its content is generated from `dist/` on every build, so the app shows exactly the website's screens.

```powershell
cd "mobile application"
npm install
npm run serve   # web app at http://127.0.0.1:4174
npm run apk     # Android app → build/GOTRAJET.apk (needs JDK 21)
```

## Run the demo only

Open [dist/index.html](dist/index.html) directly, or start a static server from this directory:

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Visit `http://127.0.0.1:4173`. The public website opens first (`#welcome`); `#home` is the signed-in dashboard and `#directory` lists every screen. No npm install or build step is required. All runtime assets are included locally.

## Project structure

```text
gotrajet/
├── README.md                  ← you are here (run, structure, features)
├── dist/                      ← the website (deploy this folder)
│   ├── index.html             page shell, SEO / social meta, links CSS + JS
│   ├── manifest.webmanifest   installable web app (icons, shortcuts)
│   ├── css/
│   │   ├── style.css          base product UI + colour tokens
│   │   ├── features.css       product screens, dark mode, RTL
│   │   └── site.css           public website, maps, motion, video, brand colours
│   ├── js/
│   │   ├── i18n.js            all texts in FR / EN / AR + language detection
│   │   └── app.js             data, routes, screens, public site, maps, events
│   └── assets/                optimised images (WebP), fonts (WOFF2), icons,
│       └── video/             hero background video (WebM + MP4, desktop + phone)
├── mobile application/       ← the mobile app (PWA + Android/iOS), built from dist/
├── docs/                      ← documentation (start with docs/README.md)
│   ├── change.md              changelog
│   ├── needs.md               what is needed for launch + Google Maps API prices
│   ├── future.md              roadmap
│   ├── feature-coverage.md    reference image → screen mapping
│   └── assets.md              image, font and video sources and licences
├── references/                ← example images and presentation (not deployed)
│   ├── mockups/               the 18 reference images, numbered 01–18
│   └── presentation/          GOTRAJET_presentation_detaillee.pptx
├── source-assets/             original PNG/JPG photos and TTF fonts (not deployed)
├── scripts/                   asset tools: optimize_assets.py, make_hero_video.py, download_assets.py
├── tests/                     browser_checks.py (Playwright regression tests)
└── outputs/qa/                screenshots and report written by the tests
```

## Public website (`#welcome`)

- Sticky header (transparent over the hero, frosted on scroll) with section links, language picker, sign-in and sign-up; burger menu below 1040px, closable with Escape.
- Hero with the live trip search (send / travel tabs), key figures, and "continue as a guest".
- How it works with a sender / traveler switch, popular routes (real demo trips), why GOTRAJET, a traveler earnings calculator (same 10% fee formula as `#publish`), trust & safety with the handoff-code illustration, community reviews (labelled as demo), FAQ, final call to action and a four-column footer.
- Fully translated (FR/EN/AR), mirrored in Arabic, dark-mode aware, and animated with scroll reveals that respect `prefers-reduced-motion`.

## International & performance

- First visit follows the browser language (Arabic, French, otherwise English); the picker choice is remembered. Page `<meta description>`, `lang`, `dir` and `og:locale` update with the language.
- SEO and sharing: description, Open Graph/Twitter card (`assets/og-image.jpg`), Organization JSON-LD, SVG favicon, Apple touch icon, and an installable web-app manifest (`manifest.webmanifest`) with shortcuts.
- Images are WebP (the hero went from 2.5 MB PNG to 178 KB) and fonts are WOFF2 (about 63% smaller); the hero image and primary fonts are preloaded. The hero video adds 1.2 MB on desktop (0.6 MB on phones) and is never loaded for reduced-motion or data-saver visitors. Originals live in `source-assets/`; regenerate with `python scripts/optimize_assets.py`.

## Google Maps

- Real Google Maps routes (driving time and distance) on search results, trip detail and parcel tracking, with a switch to the schematic parcel-progress view; a live route preview on `#publish`; a small map on each saved address; and an "Across Morocco" city explorer on the public website.
- Every map has an "Open in Google Maps" link (official `maps/dir/?api=1` / `maps/search/?api=1` URLs) and follows the site language (`hl=fr|en|ar`).
- Works without a key using Google's public embed. For production, create a key restricted to your domain with the **Maps Embed API** enabled and set `GOOGLE_MAPS_API_KEY` at the top of the maps section in `dist/js/app.js`; the official Embed API is then used automatically.
- Maps load from Google's servers when displayed (an internet connection is required for them); the privacy page says so.

## Code layout

CSS loads in order `assets/fonts.css` → `css/style.css` → `css/features.css` → `css/site.css` (later files refine earlier ones); JavaScript loads `js/i18n.js` then `js/app.js`. Images referenced from CSS use `../assets/…`; images referenced from JavaScript use `assets/…` (relative to `index.html`). Sources are kept readable (not minified). Full documentation index: [docs/README.md](docs/README.md).

## Sender and traveller spaces

One account, two spaces, with a switch **Expéditeur ⇄ Voyageur** in the side menu:

- **Espace Expéditeur:** `#space-sender`, `#parcels`, `#parcel/…` (full parcel detail, price breakdown, handoff code, receipt).
- **Espace Voyageur:** `#space-traveler`, `#trips`, `#trip/…`, `#requests`, `#request/…`, `#earnings`, `#verification`.

Bookings wait for the traveller's acceptance. Details: [docs/change.md](docs/change.md#14-two-spaces-espace-expéditeur-and-espace-voyageur-update).

## Screens and behavior

- Welcome/splash, three-step onboarding, language selection, registration (individual/carrier), email demo entry, Google/Apple/Facebook demo entry, password recovery explanation, sign-out.
- Dashboard, sender/traveler modes, city swap, date and parcel type search, route cards, route filters (price/rating/capacity), sorting, interactive schematic map with zoom and drag.
- Trip detail, vehicle/capacity/schedule, traveler reviews, favorites, traveler contact.
- Four-step parcel request: category, dimensions/weight/contents/instructions, pickup/delivery addresses, saved-address picker, recipient, compatible trip selection, request summary.
- Reservation/payment: quantity, weight validation, optional simulated insurance, transport/service fee breakdown, card/mobile wallet/cash/local wallet choices, simulated confirmation.
- Current parcels and history, parcel detail, illustrative tracking timeline, delivery code confirmation, delivered state, cancellation with simulated wallet refund.
- Become a traveler, trip publication, earnings estimate, upcoming/in-progress/completed trips, trip start/complete/delete, published routes available in search.
- Conversation list with traveler/sender/support filters, five sample contacts, local message history, notifications, unread filter, mark-read actions.
- Editable profile, saved addresses with default/edit/delete, favorites, received/given reviews, five-star review form, editable existing reviews.
- Simulated wallet top-up by card or **cash at an agency** (Cash Plus, Wafacash, Barid Cash, Damane Cash: 10-digit reference valid 48 h, 20–5 000 MAD, a demo button stands in for the agency confirmation), booking deductions/refunds, transaction history, test cards (last four digits only), default payment method.
- Language/dark mode, notification preferences that govern local notification creation, password form validation, local data export/reset.
- FAQ, support/report forms and request history, demo terms/privacy, project/about and impact screens.

See [docs/feature-coverage.md](docs/feature-coverage.md) for the image-to-screen mapping.

## Data

Browser localStorage holds `gj-v2` (local profile, preferences, addresses, messages, trips, bookings, reviews, wallet examples, notifications, support requests), `gj-draft`, `gj-language`, and `gj-sample-updates`. Existing v1 profile, trips and messages are imported when starting v2. Local data is shared by browser origin, not by real user identity. Guest/demo sign-in is navigation only and does not isolate data. Use test information only.

Parcel `GJ2048` starts in transit; its test handoff code is `2048`. A generated booking shows its own code in the confirmation form. Demonstration trip dates are relative to the current date.

### Test database (SQLite)

A small SQLite database for testing lives in `database/`: `schema.sql` (users, cities, trips, parcels, addresses, reviews, messages, payment_cards, transactions, notifications, support_tickets, cash_topups, plus a `trip_availability` view) and `seed.sql` (the same fictional demo data as the app: trips T1–T9 and MT1–MT2, parcels GJ2048/GJ1984/GJ1920 and requests RQ-A1…RQ-B2). Build it with:

```powershell
python scripts/make_test_db.py   # → database/gotrajet-test.db
```

`seed_test_accounts.sql` adds two accounts that work with each other: **Test Sender** (`U10`, sender.test@example.com) and **Test Traveler** (`U11`, traveler.test@example.com). Trips TT1–TT4 cover upcoming / in progress / completed / cancelled, and parcels TS-AWAIT, TS-ACCEPT, TS-DECLINE, TS-TRANSIT, TS-DONE, TS-CANCEL cover every parcel status (handoff codes 1001–1006), with messages, reviews both ways, wallet history and notifications.

The website does not read it yet; it is for queries, tests and a future backend. Dates are relative to the build day, so rebuild to refresh.

## Validation

```powershell
node --check dist/js/app.js
node --check dist/js/i18n.js
python tests/browser_checks.py
```

The browser checks use Python Playwright and installed Chromium against the local server. They cover every route in three languages at 1440px and 390px, check for JavaScript errors/horizontal overflow, exercise the main state-changing flows, the public website (sections, role switch, earnings calculator, mobile menu, hero search) and browser-language detection. Reports and screenshots are written to `outputs/qa/`.

## Production work remaining

Real authentication/OAuth and account isolation; server-side authorization and database; geocoding/routing/live GPS; a payment processor, refunds and payouts; actual messaging and push/WhatsApp notifications; identity and transport verification; operational insurance and support; validated service/privacy terms. The Wati PDF is reference material only; no Wati messages have been sent or automation configured. The site has not been deployed in this update.

## Assets

Photographs (WebP) and fonts (WOFF2) are bundled in `dist/assets/`; sources and the generated road-image prompt are documented in [docs/assets.md](docs/assets.md). The original reference screenshots are not redistributed as application screens. Icons and the logo treatment are inline SVG. No runtime calls to a font/image CDN are needed; only the Google Maps embeds load from Google.
