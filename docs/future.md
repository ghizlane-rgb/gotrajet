# GOTRAJET — Future

Ideas and roadmap after the current version.
Ordered by phase; each phase builds on the previous one. Production requirements are listed in [needs.md](needs.md), and past changes in [change.md](change.md).

---

## Phase 1 — Launch a real MVP (Morocco)

Goal: the first real deliveries between Casablanca, Rabat, Marrakech, Fès, Tanger, Agadir, Oujda and Meknès.

- Backend + real accounts, verified travellers, escrow payments, real chat (see needs.md, P0).
- Keep this website as the front end and connect it to an API instead of localStorage.
- Admin dashboard: verify travellers, follow bookings, handle disputes.
- Automatic emails / SMS for each step: booking, departure, arrival, handoff code.
- Clear rules for prohibited items, shown before every booking.

## Phase 2 — Better matching and trust

- ✅ **Along-the-way matching** (done 18 Nov 2026, on a built-in road network; next: price per segment, Google route).
- ✅ **Suggested price** based on distance and listed trips (done 18 Nov 2026; next: size and weight).
- **Live tracking** from the traveller's phone during the trip, shown on the Google map.
- **Photo at pickup and at handoff**, stored with the booking.
- **Verified badges:** ✅ ID checked and number of deliveries (done 18 Nov 2026); still to do: response time.
- **Two-way reviews** with moderation and dispute resolution.
- ✅ **Saved searches and alerts:** "tell me when someone drives Fès → Tanger" (done 18 Nov 2026, in-app notification; next: SMS/email). More ideas: [competitors.md](competitors.md).

## Phase 3 — Mobile apps

- Turn the website into a full PWA first: offline mode with a service worker, push notifications, "add to home screen" (the manifest is already in place).
- Then native apps (React Native or Flutter) for iOS and Android, reusing the same API.
- Native features: background GPS for travellers, camera for parcel photos, QR code instead of the 4-digit code.

## Phase 4 — International

- **Morocco ↔ Europe routes** for the diaspora (France, Spain, Belgium, Italy, Netherlands): customs rules, declared value, allowed items per country.
- **Multi-currency:** MAD and EUR first (prices are already formatted per language).
- **More languages:** Spanish, Amazigh (Tifinagh), Darija voice/text help. The translation system already supports adding a language in `dist/js/i18n.js`.
- Country-specific legal pages and payment methods.

## Phase 5 — Business and growth

- **GOTRAJET Pro** for shops and small businesses: recurring shipments, invoices, multiple users.
- Partnerships with bus companies, train stations and relay points (pickup and drop-off points).
- Referral programme (invite a traveller, get a discount).
- **Impact dashboard:** kilometres and CO₂ saved because parcels travelled on trips that were already planned.
- Loyalty levels for frequent travellers.

## Online payment plan

Research done in November 2026 on how Moroccan companies take card payments online. Fee figures and some details come from press and blogs; confirm them with the banks and providers before deciding.

### What Moroccan companies use

| Company | How customers pay | Provider behind it |
| --- | --- | --- |
| ONCF (trains) | Visa / Mastercard online (3-D Secure), Barid Cash agencies, Chaabi Pay app | Not stated publicly; very likely the CMI network (not confirmed) |
| CTM (buses) | Visa, Mastercard, Maestro, CMI cards online, e-ticket with QR code; Damane Cash partnership | CMI platform (confirmed by press) |
| Markoub.ma (bus booking, closest to GOTRAJET) | Card online, cash in Cash Plus agencies, Cash Plus Mobile wallet, PayPal / Wafacash mentioned | CMI for cards + Cash Plus for cash and wallet |
| Royal Air Maroc | Depends on country: Visa, Mastercard, PayPal, Wafacash | Several providers |
| Jumia | Moroccan and international cards (JumiaPay), cash on delivery, instalments (Wafasalaf) | CMI network for Moroccan cards |
| Marjane | Cards in store and online | Attijari Payment |
| BIM / Carrefour | Cards (mostly in store) | M2T / Damane Cash |
| Lydec (bills) | Card online | CMI |
| Small shops (Shopify, Wix) | Cards | Often PayZone |

**2025 change, the "multi-acquirer" model:**
- CMI is now a technical platform, not the company merchants sign with.
- Merchants sign with bank-owned payment companies: Attijari Payment, CDM Pay, M2T, Saham Paiements, Damane Cash, Naps, Lana Cash, Al Filahi Cash.
- Existing merchants were assigned according to their bank account (RIB).

**Stripe:**
- It does not open accounts for Moroccan companies; it would need a company abroad.
- Payouts to travellers in Morocco through Stripe Connect are not confirmed.
- None of the big Moroccan companies uses it.

### Recommendation for GOTRAJET

1. **Cards:** sign with the payment company of GOTRAJET's bank (the standard path, like ONCF, CTM and Marjane). For a faster start, PayZone or YouCan Pay (both have a developer API with test keys and webhooks).
2. **Key question for the provider:** can it hold the sender's money until the 4-digit handoff code, then pay the traveller (minus the 7% fee), and refund on cancellation?
3. **Cash and wallets:** add Cash Plus / Barid Cash / Wafacash so senders without a card can pay in an agency, as Markoub and ONCF do.
4. **International customers (diaspora):** PayPal first; Stripe only later if a company abroad is created.
5. **Backend required:** real payment cannot run in the browser. Build a small server with a provider-agnostic "payment connector" (create payment → secure payment page → webhook → verify → hold → release or refund), so providers can be added or switched without rewriting the site.
6. **Order of work:**
   - open a test (sandbox) account
   - connect it to the existing checkout in test mode
   - sign the contract and switch to live keys
7. **Legal check:** holding money for others is regulated by Bank Al-Maghrib; confirm the setup with the bank and a lawyer.

**Model to copy:** Markoub.ma (cards through CMI + Cash Plus for cash and wallet payments).

## Technical improvements

| Topic | Idea |
| --- | --- |
| Code structure | Split `app.js` (about 2,700 lines) into modules; consider a small framework (Vue, Svelte or React) once the backend exists. |
| Build | Add a build step (Vite): bundling, minification for production, cache-busting file names. |
| Types and tests | TypeScript, unit tests for prices and fees, keep the Playwright browser tests in CI (GitHub Actions). |
| CSS | Merge `style.css`, `features.css` and `site.css` into one design-token system; define dark mode tokens in one place. |
| Dark mode | Follow the device setting automatically (`prefers-color-scheme`) on first visit. |
| Accessibility | Full WCAG 2.2 AA audit: contrast in dark mode, screen-reader labels for maps, keyboard paths. |
| Performance | Responsive images (`srcset`), subset the Arabic font, lazy-load the maps only when visible. |
| Security | Content-Security-Policy, rate limiting, audit logs, encrypted personal data. |
| SEO | One indexable URL per page (history routing instead of `#hash`), sitemap, translated pages with `hreflang`. |
