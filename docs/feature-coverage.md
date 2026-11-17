# Reference coverage

The 18 reference images are in [references/mockups/](../references/mockups/) (renamed from the original `WhatsApp Image 2026-10-25 at …` files, in the same order).

The supplied images contain multiple alternative versions of the same app. This implementation combines their distinct screens and controls into one consistent responsive website. It does not reproduce every alternative mockup pixel for pixel.

| Reference image | Content shown | Implemented routes / controls |
| --- | --- | --- |
| [18-profile-menu](../references/mockups/18-profile-menu.jpeg) | Profile and account menu | `#profile`, edit profile, parcels, trips, payments, reviews, notifications, settings, help |
| [17-messages-contacts](../references/mockups/17-messages-contacts.jpeg) | Five contacts, message filters | `#messages`, All/Travelers/Senders/Support tabs, local conversation history |
| [16-payment-summary](../references/mockups/16-payment-summary.jpeg) | Price summary and three payment choices | `#checkout/T4`, itemized fees, total, card/mobile wallet/cash plus local wallet simulation |
| [15-tracking-map-timeline](../references/mockups/15-tracking-map-timeline.jpeg) | Map, timeline, traveler contact | `#tracking/GJ2048`, map drag/zoom, statuses, estimated arrival, contact, handoff code |
| [14-publish-trip-earnings](../references/mockups/14-publish-trip-earnings.jpeg) | Trip publication, date/time/capacity/vehicle, earnings | `#publish`, validated form, car/train/bus selection, earnings estimate, `#trips` |
| [13-trip-results-filters](../references/mockups/13-trip-results-filters.jpeg) | Trip results, price/time/reviews/places filters | `#results`, matching routes, sort/filter controls, traveler cards and detail links |
| [12-parcel-form-4-steps](../references/mockups/12-parcel-form-4-steps.jpeg) | Four-step parcel form | `#send`, categories, dimensions, weight, contents, notes, addresses, compatible trip, summary |
| [11-dashboard-active-parcel](../references/mockups/11-dashboard-active-parcel.jpeg) | Dashboard, sender/traveler switch, routes, active parcel | `#home`, search, quick actions, popular routes, current shipments |
| [10-sixteen-screen-overview](../references/mockups/10-sixteen-screen-overview.jpeg) | Sixteen-screen overview | Welcome, login/register, home, search, detail, tracking, parcels/history, profile, publish, checkout, messages, notifications, help, review, settings, impact |
| [09-signup-results-payments](../references/mockups/09-signup-results-payments.jpeg) | Signup roles, trip results, payments, tabs | `#register`, individual/carrier choice, trip list/detail, delivery history, trip state tabs, messages, profile, payment methods |
| [08-dashboard-parcel-trust](../references/mockups/08-dashboard-parcel-trust.jpeg) | Dashboard and parcel workflow with trust section | `#home`, `#send`, quick actions, trust banner and how-it-works section |
| [07-search-tracking-wallet-profile](../references/mockups/07-search-tracking-wallet-profile.jpeg) | Search, route list, tracking, wallet, profile/preferences | `#results`, `#tracking`, `#wallet`, `#profile`, `#settings` |
| [06-splash-auth-map-reservation](../references/mockups/06-splash-auth-map-reservation.jpeg) | Splash, authentication, map search, reservation, traveler entry, favorites | `#welcome`, `#login`, `#register`, `#results`, `#detail/T4`, `#checkout/T4`, `#traveler`, `#favorites` |
| [05-home-quick-actions-cities](../references/mockups/05-home-quick-actions-cities.jpeg) | Home detail, quick actions, popular cities, safe transport | `#home`, route photos, sending/traveler/tracking/support access, safety banner, bottom navigation |
| [04-search-route-cards-wallet](../references/mockups/04-search-route-cards-wallet.jpeg) | Search date/type, wallet/support, route cards, traveler promotion | `#home`, date/type search, route cards, wallet/help, traveler CTA |
| [03-welcome-languages-onboarding](../references/mockups/03-welcome-languages-onboarding.jpeg) | Welcome, FR/AR/EN, benefit carousel, signup/login | `#welcome`, `#onboarding`, language selection, three benefit slides, registration/sign-in |
| [02-sender-traveler-modes](../references/mockups/02-sender-traveler-modes.jpeg) | Sender/traveler modes, benefits, four steps, recommended routes | `#home`, sender/traveler switch, category/date filters, how-it-works, recommended route cards |
| [01-dark-theme-categories-wallet](../references/mockups/01-dark-theme-categories-wallet.jpeg) | Dark visual theme, categories, shipments, wallet | `#settings` dark mode, `#home` categories and shipments, `#wallet`, `#impact` |

## Additional screens needed to complete the pictured controls

`#addresses`, `#payments`, `#favorites`, `#reviews`, `#review/GJ1984`, `#traveler-reviews/T4`, `#notifications`, `#notification-settings`, `#security`, `#forgot`, `#support`, `#report`, `#tickets`, `#terms`, `#privacy`, `#about`, `#parcel/GJ2048`, and `#success/GJ2048`.

## Simulation boundary

All screen navigation and local data operations work. Registration/social login are demo entry flows, not identity verification. The map is interactive but schematic, not live GPS. Payments, insurance and wallet operations are simulated. Chat and support submissions stay in the browser. A backend and service-provider integrations are required before real customers use the platform.
