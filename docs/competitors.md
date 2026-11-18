# GOTRAJET — Competitors and product strategy

Research done on **18 November 2026**. Websites were checked directly that day. Some competitor sites block automated visits, so their apps could not be inspected in depth; those are marked as such. Figures come from the companies' own pages or press articles and are not independently verified.

---

## 1. Who does the same job

### Morocco

| Platform | Model | Link | Status (18 Nov 2026) |
| --- | --- | --- | --- |
| PeeCoop (Red Ant) | Vehicle owners deliver goods in cities; price negotiated with each driver | [peecoop.com](https://www.peecoop.com) | Online. App links outdated |
| Colis.ma | Morocco ↔ Europe courier (not travellers) | [colis.ma](https://colis.ma) | Online, growing (Brussels office 2026) |
| Tawssil (Cash Plus) | Parcels through Cash Plus agencies | [cashplus.ma](https://www.cashplus.ma) | Active |
| BlaBlaCar Maroc | Intercity carpooling, no parcels | [blablacar.ma](https://www.blablacar.ma) | Launched 2026: possible partner or future competitor |
| Sheaply | Traveller luggage space, France ↔ Morocco | — | Site down: likely closed |

### International

| Platform | Model | Link | Status |
| --- | --- | --- | --- |
| SendPal | Verified travellers, escrow, in-app chat | [sendpal.io](https://sendpal.io) | Online, but the trip feed showed "Unable to load trips" |
| CarryLug | Travellers + forwarders, price per kg | [carrylug.com](https://www.carrylug.com) | Online, 6 active trips |
| GoHappyGo | Traveller parcels, AXA insurance | [gohappygo.fr](https://www.gohappygo.fr) | Online |
| Cocolis | Carpool parcels, France only | [cocolis.fr](https://www.cocolis.fr) | Active |
| Grabr | Travellers buy and bring products abroad | [grabr.io](https://grabr.io) | App listed |
| KaColis, KiloBled, Koper, GS Colis, Peacock Connect | Small diaspora "sell your kilos" apps | App stores | Small |
| PiggyBee, Jwebi, Colisdays | Traveller parcels | — | Domains parked or gone: closed |

---

## 2. What we learned

| Competitor | Best at | Weak at |
| --- | --- | --- |
| SendPal | Clear two-sided hero ("Send items / Transport items"), Persona ID check, escrow message | Empty or broken trip feed, `#` placeholder links, no pricing, no rules on prohibited items, vague "100% insured" claim, conflicting phone numbers |
| CarryLug | Trip cards with trust tier, price per kg, available weight; printable labels | Every profile shows 0 reviews; no escrow or insurance; mixed currencies; hidden "shipping cost will be added" |
| PeeCoop | Local, 3 languages, map route in app | No published price, no verification, tracking or payment info; you must contact the team to get the app |
| Colis.ma | Segment pages (individuals, business, e-commerce), press logos | No price or quote on the site, apps "coming soon", placeholder links, empty news section |
| GoHappyGo | Insurance partner (AXA) | The site gives no detail without an account |

**Patterns across the market:**
1. **Prices are hidden.** No competitor shows a price before you sign up or contact them.
2. **Prohibited items are ignored.** Nobody checks them; at best there is a line in the terms.
3. **Trust is claimed, not shown.** Badges with 0 reviews, or "insured" with no terms.
4. **Marketplaces look empty.** Few trips, and an empty search is a dead end.
5. **Exact-route matching only.** A Casablanca → Agadir driver is invisible to someone sending Casablanca → Marrakech.

---

## 3. Where GOTRAJET stands

Already ahead before this work: escrow with a 4-digit handoff code, refunds, disputes, cash top-up through Moroccan networks, verified travellers with admin review, chat, two-way reviews, FR/EN/AR with RTL, dark mode, PWA and Android app, admin panel.

Added on 18 November 2026 (details in [change.md](change.md)), each one aimed at a pattern above:

| Market gap | GOTRAJET answer |
| --- | --- |
| 1. Hidden prices | Public price guide: distance range + median of real listed trips, before signing up |
| 2. Prohibited items ignored | Live check while typing, in 3 languages + Darija; forbidden items blocked before booking |
| 3. Trust claimed | "ID verified" and delivery count computed from records; not displayed when unknown |
| 4. Empty marketplace | Route alerts turn an empty search into a waiting customer; along-the-way matching multiplies the trips each search finds |
| 5. Exact routes only | Along-the-way matching on the Moroccan road network, in search, booking and alerts |

---

## 4. Ideas for next steps

Ranked by value for effort. "Feasible" refers to the current stack (FastAPI + PostgreSQL + vanilla JS).

### Quick wins

| Idea | Problem | Who | How | Feasible |
| --- | --- | --- | --- | --- |
| Alerts by email/SMS | In-app notifications are missed | Senders | Send `routeAlert` through the existing `notify(..., sms=True)` once SMS costs are approved | Yes, one flag |
| "My alerts" in Settings | Alerts are only visible on the results page | Senders | Reuse `alertsStrip()` on `#notification-settings` | Yes |
| Share a trip link | Travellers fill trips through WhatsApp | Travellers | Native share / WhatsApp link to `#detail/ID` | Yes |
| Response time on profile | Senders don't know if a traveller answers fast | Senders | Median of `accepted_at - created_at` per traveller, shown like the delivery count | Yes, server-side |

### High-impact improvements

| Idea | Problem | Who | How | Feasible |
| --- | --- | --- | --- | --- |
| Price per segment | On an along-the-way trip, the sender pays the full route price | Senders | Traveller sets a price per km or per segment; checkout prorates by `roadPath` distance | Yes; needs a `price_mode` table, not a column (no migrations) |
| Pickup and handoff photos | Disputes have no evidence | Both | Reuse the verification upload pipeline on pickup and delivery | Yes; storage needed online (Vercel has no disk) |
| QR handoff | Typing 4 digits on the street | Travellers | QR of the code on the sender's screen, scanned by the Android app camera | Yes (Capacitor) |
| Real payment provider | Card payment is sandbox only | Everyone | See the payment plan in [future.md](future.md) | Needs a contract |

### Innovative features

| Idea | Problem | Who | How | Why better | Feasible |
| --- | --- | --- | --- | --- | --- |
| AI parcel description | Senders write vague descriptions; travellers refuse at pickup | Senders | Photo → model suggests category, size, weight range and risk flags, the sender confirms | No competitor checks content at all | Yes with a vision API; cost per call; keep the keyword check as fallback |
| Demand heatmap for travellers | Travellers don't know which trips pay | Travellers | Aggregate alerts + unmatched searches per route and day → "12 senders wait for Fès → Tanger this week" | Turns alerts into supply | Yes, data already collected |
| Multi-leg relay | No direct traveller for Oujda → Agadir | Senders | Chain two trips meeting in one city with a relay handoff code | Unique; covers long routes | Hard: two escrows, timing risk |

### Long-term opportunities

- **Diaspora routes** (Morocco ↔ France/Spain/Belgium) with customs rules per country. The road network becomes a route network with flights and ferries (Tanger Med).
- **GOTRAJET Pro** for e-commerce sellers: scheduled shipments on recurring trips, invoices.
- **Partnerships**: bus companies (CTM) and BlaBlaCar Maroc for capacity; Cash Plus / Barid Cash agencies as pickup points.

---

## 5. Remaining gaps

| Gap | Why it matters | Next step |
| --- | --- | --- |
| Distances are approximate | Price guide and durations use a 9-link road network, not live routing | Google Directions API once a key is configured |
| Along-the-way price | Sender pays the traveller's full-route price | Price per segment (above) |
| Alert notifications are in-app only | Users who don't open the app miss them | SMS/email (quick win) |
| Keyword risk check | Can miss unusual wording; can be bypassed by vague text | Traveller can still refuse at pickup; AI description (above) |
| Demo reviews on the landing page | Labelled "Demo reviews", but still not real | Replace with real reviews after launch |
