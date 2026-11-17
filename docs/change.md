# GOTRAJET — Changes

All changes made on **11 November 2026**, grouped by topic.
The colour palette was kept as it was: navy `#0b3052`, blue `#1762a1`, orange `#ff8616`, green `#19876c`, background `#f5f7fa`.

---

## 1. New public website (`#welcome`)

The old splash screen was replaced by a full marketing website. It is the first page visitors see.

| Section | What it does |
| --- | --- |
| Header | Sticky; transparent over the hero, frosted white on scroll. Links: How it works, Routes, Map, Travel, Safety, FAQ. Language picker, Sign in, Create account. Burger menu below 1040px (Escape closes it). |
| Hero | Large headline, live trip search (Send / Travel tabs), "Continue as a guest", 4 key figures (8 cities, 3 languages, 4-digit code, 0 extra km). |
| How it works | Switch between the sender steps and the traveller steps, each with a call to action. |
| Popular routes | Real demo trips (same data as the app), "View all". |
| Across Morocco | Google Maps city explorer; clicking a city moves the map and pre-fills the search. |
| Why GOTRAJET | Six benefit cards. |
| Travellers | Earnings calculator with sliders (same 7% fee formula as `#publish`). |
| Trust & safety | Safety checklist and an illustration of the handoff code. |
| Community | Three reviews, clearly labelled "Demo reviews". |
| FAQ | Existing FAQ in accordion form + contact support. |
| Final CTA + footer | Call-to-action banner; four-column footer (service, company, support, legal), language picker, demo notice, back to top. |

Also:
- Scroll-reveal animations that respect `prefers-reduced-motion`.
- Works in light and dark mode, and mirrored in Arabic (RTL).

## 2. Google Maps

- Real driving routes (distance + travel time) on **search results**, **trip detail** and **parcel tracking**.
- A tab switches between Google Maps and the existing schematic map that shows the parcel's progress.
- Route preview on **Publish a trip** that updates when the cities change.
- Small map on each **saved address**.
- "Open in Google Maps" button on every map (official Google URLs, opens the app on phones).
- Maps follow the site language (French, English, Arabic).
- Works without an API key. If `GOOGLE_MAPS_API_KEY` is set in `dist/js/app.js`, the official Maps Embed API is used automatically.
- The privacy page (FR/EN/AR) now explains that maps load from Google's servers.

## 3. International

- **Language detection on first visit:** Arabic and French browsers get their language, all others get English. The visitor's choice is remembered.
- 375 interface phrases, every one available in French, English and Arabic.
- The page description, `lang`, `dir` and `og:locale` update with the language.
- **SEO and sharing:** description, Open Graph and Twitter card with a new 1200×630 image (`assets/og-image.jpg`), Organization structured data (JSON-LD).
- **Installable web app:** `manifest.webmanifest` with icons and shortcuts (Send, Publish, Track).
- New SVG favicon, Apple touch icon, 192/512 and maskable icons, all built from the existing logo.

## 4. Inside the app

- A "Back to website" link in the top bar (it replaces the developer-only "All screens" pill, which is now in the footer).
- The app footer links back to the website, and the copyright year updates automatically.
- Smoother hover states, shadows and transitions on buttons and cards, with zoom on route photos and clearer keyboard focus rings.

## 5. Performance

| Asset | Before | After |
| --- | --- | --- |
| Hero photo | 2.5 MB PNG | 178 KB WebP |
| Route photos | 404 KB JPG | 241 KB WebP |
| Fonts (13 files) | 1.4 MB TTF | 0.5 MB WOFF2 |
| Deployed `dist/` folder | about 4.5 MB | about 1.5 MB |

- The hero image and the main fonts are preloaded.
- The originals were moved (not deleted) to `source-assets/`.

## 6. Bug fixes

- The map's zoom-out and reset buttons, and the progress label, showed `?` because of a character-encoding error. They now show `−`, `⟲` and `·`.
- The app's global `footer` and `nav` styles leaked into the new website and hid its footer. App footer rules are now scoped to `.shell > footer`.

## 7. Code quality

- `app.js`, `i18n.js`, `style.css` and `features.css` were minified (squashed onto a few long lines). They are now formatted and readable; the code itself did not change.
- New stylesheet `dist/css/site.css` for the website, maps and global polish, built only on the existing colour tokens.
- New script `scripts/optimize_assets.py` regenerates the WebP images, WOFF2 fonts, social image and icons from `source-assets/`.

## 8. Tests

`tests/browser_checks.py` was extended. Result: **234 screens × 3 languages, 19 flows, 0 errors, 0 horizontal overflow.**

New checks:
- Website sections, sender/traveller switch, earnings calculator maths (4 × 100 MAD → 372 MAD), mobile menu and Escape, hero search.
- Coverage map city buttons.
- Browser-language detection (`ar-MA` → Arabic/RTL, `fr-FR` → French, `de-DE` → English).
- Google Maps routes on trip detail, publish preview, Google/schematic switch.
- Screenshots use reduced motion. New screenshots: `welcome-mobile.png` and `welcome-arabic.png`.

## 9. Files

**Added**
- `dist/css/site.css`
- `dist/manifest.webmanifest`
- `dist/assets/` images: `favicon.svg`, `og-image.jpg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`
- `dist/assets/` WebP photos and WOFF2 fonts
- `scripts/optimize_assets.py`
- `needs.md`, `change.md`, `future.md`

**Changed**
- `dist/index.html`, `dist/js/app.js`, `dist/js/i18n.js`, `dist/css/style.css`, `dist/css/features.css`, `dist/assets/fonts.css`
- `tests/browser_checks.py`, `README.md`, `ASSETS.md`

**Moved** to `source-assets/`
- `gotrajet-road.png`, the three route JPGs, all TTF fonts

---

## 10. Motion and dynamic design (update)

The public website now has movement, like large international product sites, using the same colours. Every effect is either CSS or light JavaScript that animates only transform and opacity, so it stays smooth. Visitors who turn on "reduce motion" in their device settings get a calm, fully visible static page.

| Where | Effect |
| --- | --- |
| Hero | Slow cinematic zoom on the photo, parallax while scrolling, headline words rising one by one, text and search box fading in in sequence |
| Hero | Floating glass **"Next departures"** card (real demo trips) with a pulsing **Live** dot, a parcel travelling along a dotted route, and a highlight that moves to the next departure every 2.6 s |
| Hero | Statistics count up when they come into view (the "0 extra km" counts down from 250); scroll cue with a moving wheel |
| Below the hero | Endless **city marquee** (Casablanca, Rabat, Marrakech…) that pauses on hover |
| Whole page | Orange **scroll-progress bar** under the header; sections reveal with a staggered rise; pulsing section markers |
| Cards | **3D tilt** that follows the mouse, with an orange spotlight, on step, benefit, route and review cards (mouse only, off on touch screens) |
| Buttons | Light **shine sweep** on orange buttons, arrows nudge forward, soft glow on "Create an account" |
| How it works | Marching dashed line linking the steps; step icons float gently |
| Trust & safety | The handoff code **types itself** (2-0-4-8), turns green and shows "Handoff confirmed", in a loop |
| Earnings calculator | The total **counts smoothly** to the new value and bumps slightly |
| Call to action | Orange and blue glows drifting behind the banner |
| Map and FAQ | City pins bounce when selected; maps fade in; FAQ answers slide open |
| Inside the app | Smooth fade-up transition between pages |

Tests: **234 screens, 20 flows, 0 errors.**
- The new motion test checks that departures rotate, the marquee moves and the counters land on the right values.
- It also checks that reduced-motion mode shows everything static and fully visible.

Fix found while testing: in reduced-motion mode the staggered delays were not removed, so some headline words stayed hidden for up to about a second. They now appear immediately.

---

## 11. Hero background video (update)

A short muted video now plays behind the hero headline, like large international brand sites. It tells the GOTRAJET story in 14.6 seconds, looping:

1. **The traveller loads the parcels** into the vehicle.
2. **The van drives a mountain road at dusk** (matching the brand's road photo).
3. **The parcel is handed over** through the window, with a thumbs-up.

Details:
- **Sources:** three Pexels clips (free licence), credited in [assets.md](assets.md). They are cross-faded, colour-matched and encoded by `scripts/make_hero_video.py`.
- **Light files:**
  - desktop: 1.2 MB WebM / 1.7 MB MP4, 1280×720
  - phones: 0.6 MB WebM / 0.7 MB MP4, 854×480
  - each browser downloads only the one it needs
- **Seamless:** the road photo shows first; the video fades in only once it is really playing, so there is no black flash.
- **Readable:** on desktop the full 16:9 frame sits across the top of the hero and fades into the navy. A lighter overlay keeps the text side dark and the action side visible. On phones it is a soft full-screen backdrop.
- **Respectful:**
  - a **pause/play button** sits next to the scroll cue (an accessibility requirement for auto-playing video)
  - the video pauses automatically when scrolled out of view
  - it never loads for visitors with "reduce motion" or data-saver turned on
- **Tests:** 234 screens, **21 flows**, 0 errors. A new flow checks muted autoplay, the pause/play button, and no video in reduced-motion mode.

---

## 12. Less white, more navy and orange (update)

The website now uses a strong colour rhythm based only on the brand navy `#0b3052` and orange `#ff8616`. White is kept only where it helps reading (form fields, route cards, FAQ answers, the earnings card).

| Section | Before | Now |
| --- | --- | --- |
| Header (when scrolling) | White frosted | **Navy** frosted glass, white text |
| Mobile menu | White | **Navy** |
| Hero search box | White block | **Navy glass**, white fields |
| How it works | White | **Light orange** background, **navy** step cards, orange switch |
| Popular routes | Light grey | **Navy** with an orange glow |
| Across Morocco (map) | White | Soft navy tint, **orange** active city |
| Why GOTRAJET | White | **Full orange**, **navy** cards with orange icons |
| Trust & safety | Light grey | **Light orange** |
| Reviews | White | **Navy**, glass cards, orange avatars |
| FAQ | Light grey | Soft navy tint |
| Final call to action | Navy card on grey | **Orange** card on navy, flowing into the footer |
| App side menu | White | **Navy**, orange active item |
| App top bar | White | **Navy** |
| App background | Near-white | Light navy tint |

- Dark mode keeps working: the light-orange and tinted sections switch to dark navy.
- Tests: 234 screens, 21 flows, 0 errors.

---

## 13. Project organisation (update)

The files are now grouped by purpose. The website works exactly as before.

| What | Before | Now |
| --- | --- | --- |
| Stylesheets | `dist/style.css`, `dist/features.css`, `dist/site.css` | `dist/css/` (image paths inside now use `../assets/…`) |
| JavaScript | `dist/app.js`, `dist/i18n.js` | `dist/js/` |
| 18 example images | `WhatsApp Image 2026-10-25 at ….jpeg` in the root | `references/mockups/01-…jpeg` to `18-…jpeg`, with clear names |
| Presentation | `GOTRAJET_presentation_detaillee (1).pptx` in the root | `references/presentation/GOTRAJET_presentation_detaillee.pptx` |
| Documentation | 6 `.md` files in the root | `README.md` stays in the root; the rest is in `docs/` with an index (`docs/README.md`) |

- File names in the docs were updated: `ASSETS.md` → `docs/assets.md`, `FEATURE_COVERAGE.md` → `docs/feature-coverage.md`.
- The feature-coverage table now links each row to its renamed image.
- All paths and links were updated in `index.html` and the docs.
- The README has a project-structure map.
- Checked:
  - no broken Markdown links
  - no missing files when loading the site
  - JavaScript syntax OK
  - tests: 234 screens, 21 flows, 0 errors

---

## 14. Two spaces: Espace Expéditeur and Espace Voyageur (update)

The same account now has two separate spaces, like "guest" and "host" on large platforms. A switch **Expéditeur ⇄ Voyageur** sits at the top of the side menu (in the top bar on phones). Each space has its own menu, and opening a page of the other space switches automatically.

### Espace Expéditeur (sender)

| Screen | Details shown |
| --- | --- |
| **Dashboard** (`#space-sender`) | Active shipments, parcels delivered, money spent this month, requests awaiting acceptance. The shipment to follow, with a progress stepper, traveller and handoff code. A table of all shipments, requests still without a traveller, and quick links (addresses, payments, wallet, reviews to give). |
| **My shipments** (`#parcels`) | One card per shipment: stepper, traveller and rating, parcel type and weight, recipient, price. |
| **Parcel detail** (`#parcel/…`) | **Everything:** the parcel (type, dimensions, weight, quantity, contents, instructions, insurance); the traveller and trip (rating, vehicle, departure, duration, reviews); the addresses and recipient (name, phone); the price breakdown (transport, service fee, insurance, total, payment method, payment status). Plus the 4-digit handoff code and actions: track, contact, rate, **download receipt**, cancel, report a problem. |

### Espace Voyageur (traveller)

| Screen | Details shown |
| --- | --- |
| **Dashboard** (`#space-traveler`) | Profile verification progress; earnings this month and pending; requests to handle; parcels delivered. Next trip with capacity bars (spaces and weight) and parcels on board; requests to accept or refuse; available earnings. |
| **My trips** (`#trips`) and **trip detail** (`#trip/…`) | Date, vehicle, capacity, price per parcel, meeting points and notes. Gross / 7% fee / net, and the Google Maps route. **Every parcel on board** with sender, recipient, contents, dimensions, weight, declared value, insurance, pickup and drop-off addresses. Actions: confirm pickup, and confirm handoff with the recipient's code. |
| **Requests** (`#requests`, `#request/…`) | Awaiting / accepted / declined. Full details of each request, accept or refuse. Phone numbers stay hidden until the request is accepted. |
| **Earnings** (`#earnings`) | Total, this month, pending, available. History per parcel (gross, fee, net) and **transfer to the wallet**. |
| **Verification** (`#verification`) | ID, phone, photo, driving licence and vehicle registration, each with status. Adding a document marks it "under review", then "verified" (demo); the file is not stored. |

### New booking flow

- A booking is now **"Awaiting acceptance"** until the traveller replies.
- In the demo, the traveller accepts after about 5 seconds, with a notification.
- The money is shown as "held until handoff", then "paid to the traveller" after delivery, or "refunded" if cancelled.
- Publishing a trip brings a first demo request to accept.

### Other

- About 110 new phrases (FR / EN / AR); everything works in Arabic (right-to-left), on phones and in dark mode.
- Tests: **276 screens, 23 flows, 0 errors**. New flows cover the switch, accept, pickup, coded handoff, decline, earnings transfer, the full parcel detail and the acceptance wait.

