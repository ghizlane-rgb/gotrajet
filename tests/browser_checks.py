"""Browser regression checks. Run against the static server on port 4173.
Requires the already installed Python Playwright and Chromium.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'outputs' / 'qa'
ARTIFACTS.mkdir(parents=True, exist_ok=True)
URL = 'http://127.0.0.1:4173'
errors = []
report = {'screens': [], 'flows': [], 'overflows': []}

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    # UI functionality should work without font and image CDNs.
    page.route('https://**/*', lambda route: route.abort())
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='domcontentloaded')
    page.wait_for_selector('.welcome-content')
    screens = page.evaluate("Object.keys(pages)")

    def go(route):
        page.evaluate('(r) => go(r)', route)
        page.wait_for_timeout(35)
        assert page.locator('#main').inner_text().strip(), route

    for language in ['fr', 'en', 'ar']:
        page.evaluate('(lang) => setLanguage(lang)', language)
        for width in [1440, 390]:
            page.set_viewport_size({'width': width, 'height': 950})
            for screen in screens:
                route = screen
                if screen in ['detail', 'checkout', 'traveler-reviews']:
                    route += '/T4'
                if screen in ['tracking', 'parcel']:
                    route += '/GJ2048'
                if screen == 'review':
                    route += '/GJ1984'
                if screen == 'trip':
                    route += '/MT1'
                if screen == 'request':
                    route += '/RQ-A1'
                go(route)
                report['screens'].append(f'{language}:{width}:{screen}')
                overflow = page.evaluate('document.documentElement.scrollWidth > innerWidth + 2')
                if overflow:
                    report['overflows'].append(f'{language}:{width}:{screen}')

    page.evaluate("setLanguage('fr')")
    page.set_viewport_size({'width': 1440, 'height': 1000})
    go('register')
    page.locator('[name=name]').fill('Demo Tester')
    page.locator('[name=email]').fill('demo@example.com')
    page.locator('[name=phone]').fill('+212 600 123 456')
    page.locator('[name=password]').fill('temporary-test-password')
    page.locator('[name=terms]').check()
    page.locator('#auth-form button[type=submit], #auth-form .btn.wide').click()
    page.wait_for_url('**/#home')
    assert page.evaluate('state.profile.name') == 'Demo Tester'
    assert 'temporary-test-password' not in page.evaluate('JSON.stringify(localStorage)')
    report['flows'].append('Registration demo and no persisted password')

    go('addresses')
    page.locator('[data-action=add-address]').first.click()
    page.locator('#address-form [name=label]').fill('Maison')
    page.locator('#address-form [name=street]').fill('12 rue de test')
    page.locator('#address-form .btn.wide').click()
    assert page.locator('.address-grid').inner_text().find('12 rue de test') >= 0
    report['flows'].append('Saved address')

    go('detail/T4')
    page.locator('[data-action=favorite]').click()
    go('favorites')
    assert page.locator('.route-card').count() == 1
    report['flows'].append('Favorite route')

    go('wallet')
    page.locator('[data-action=topup]').click()
    page.locator('#topup-form [name=amount]').fill('200')
    page.locator('#topup-form .btn').click()
    assert page.evaluate('state.balance') == 450
    report['flows'].append('Simulated wallet top-up')

    # Cash top-up at an agency: pending reference first, balance credited only after "agency" confirms.
    page.locator('[data-action=topup]').click()
    page.locator('#topup-form [name=amount]').fill('100')
    page.locator('#topup-form [name=method][value="Cash Plus"]').check()
    page.locator('#topup-form .btn').click()
    assert page.locator('.cash-ref').is_visible()
    assert page.evaluate('state.balance') == 450
    assert page.evaluate('state.cashTopups[0].status') == 'pending'
    page.locator('[data-action=cash-pay]').click()
    assert page.evaluate('state.balance') == 550
    assert page.evaluate('state.transactions[0].key') == 'topupCash'
    # A second one cancelled leaves the balance alone; then restore 450 for the flows below.
    page.locator('[data-action=topup]').click()
    page.locator('#topup-form [name=amount]').fill('60')
    page.locator('#topup-form [name=method][value=Wafacash]').check()
    page.locator('#topup-form .btn').click()
    page.locator('[data-action=cash-cancel]').click()
    assert page.evaluate('state.balance') == 550
    page.evaluate('state.balance = 450; persist()')
    report['flows'].append('Simulated cash top-up at an agency (pay and cancel)')

    go('checkout/T4')
    page.locator('#checkout-form [name=quantity]').fill('2')
    page.locator('#checkout-form [name=quantity]').dispatch_event('change')
    page.locator('#checkout-form [name=insurance]').check()
    page.locator('#checkout-form [name=payment][value=wallet]').check()
    page.locator('#checkout-form button.btn.wide').click()
    page.wait_for_url('**/#success/*')
    assert page.evaluate('state.bookings[0].price') == 260
    assert page.evaluate('state.balance') == 190
    assert page.evaluate("freeSeats(getTrip('T4'))") == 1
    bid = page.evaluate('state.bookings[0].id')
    go('parcel/' + bid)
    page.locator('[data-action=cancel-booking]').click()
    page.locator('[data-action=confirm-cancel]').click()
    assert page.evaluate('state.balance') == 450
    assert page.evaluate("freeSeats(getTrip('T4'))") == 3
    report['flows'].append('Quantity, insurance, wallet booking and cancellation refund')

    go('tracking/GJ2048')
    page.locator('[data-action=handoff]').click()
    page.locator('#handoff-form [name=code]').fill('0000')
    page.locator('#handoff-form .btn').click()
    assert page.evaluate("getParcel('GJ2048').status") == 'transit'
    page.locator('#handoff-form [name=code]').fill('2048')
    page.locator('#handoff-form .btn').click()
    assert page.evaluate("getParcel('GJ2048').status") == 'delivered'
    go('review/GJ2048')
    page.locator('[data-action=star][data-value="5"]').click()
    page.locator('#review-form [name=comment]').fill('Très bien, merci !')
    page.locator('#review-form > .btn').click()
    page.wait_for_url('**/#reviews')
    assert page.evaluate('state.reviews[0].rating') == 5
    report['flows'].append('Invalid/valid handoff code and delivery review')

    go('send')
    page.locator('#parcel-form [name=content]').fill('Livres de test')
    page.locator('#parcel-form .detail-actions > .btn').last.click()
    page.locator('#parcel-form [name=pickup]').fill('Départ de test')
    page.locator('#parcel-form [name=dropoff]').fill('Arrivée de test')
    page.locator('#parcel-form [name=recipient]').fill('Recipient Test')
    page.locator('#parcel-form [name=phone]').fill('+212 600 000 000')
    page.locator('#parcel-form .detail-actions > .btn').last.click()
    page.locator('#parcel-form input[name=tripId][value=""]').check()
    page.locator('#parcel-form .detail-actions > .btn').last.click()
    page.locator('#parcel-form .detail-actions > .btn').last.click()
    page.wait_for_url('**/#success/*')
    assert page.evaluate('state.requests.length') == 1
    report['flows'].append('Four-step parcel request')

    go('publish')
    page.locator('#publish-form > .btn.wide').click()
    page.wait_for_url('**/#trips')
    assert page.evaluate('state.published.length') == 1
    published_id = page.evaluate('state.published[0].id')
    # Publishing brings a first demo request from a sender, waiting for the traveller.
    assert page.evaluate(f"incomingAll().some(r => r.tripId === '{published_id}' && r.status === 'awaiting')")
    page.locator(f'[data-action=trip-advance][data-value="{published_id}"]').click()
    assert page.evaluate('state.published[0].status') == 'inProgress'
    report['flows'].append('Publish and start a trip')

    # Two spaces on one account: sender (expéditeur) and traveller (voyageur).
    go('space-sender')
    assert page.evaluate('state.space') == 'sender'
    page.locator('.sidebar [data-action=switch-space][data-value=traveler]').click()
    page.wait_for_url('**/#space-traveler')
    assert page.evaluate('state.space') == 'traveler'
    assert page.locator('#nav [data-nav=requests]').count() == 1
    assert page.locator('#nav [data-nav=parcels]').count() == 0
    go('trip/MT1')
    page.locator("[data-action=accept-request][data-value='RQ-A1']").first.click()
    assert page.evaluate("getIncoming('RQ-A1').status") == 'accepted'
    page.locator("[data-action=pickup-request][data-value='RQ-A2']").first.click()
    assert page.evaluate("getIncoming('RQ-A2').status") == 'pickedUp'
    page.locator("[data-action=deliver-request][data-value='RQ-A2']").first.click()
    page.locator('#request-handoff-form [name=code]').fill('0000')
    page.locator('#request-handoff-form .btn').click()
    assert page.evaluate("getIncoming('RQ-A2').status") == 'pickedUp'
    page.locator('#request-handoff-form [name=code]').fill('5821')
    page.locator('#request-handoff-form .btn').click()
    assert page.evaluate("getIncoming('RQ-A2').status") == 'delivered'
    go('requests')
    page.locator("[data-action=decline-request][data-value='RQ-A3']").click()
    page.locator('[data-action=confirm-decline]').click()
    assert page.evaluate("getIncoming('RQ-A3').status") == 'declined'
    go('earnings')
    available = page.evaluate('earningsSummary().available')
    assert available == 180, available  # 63 + 63 + 54, each net of the 10% fee
    balance = page.evaluate('state.balance')
    page.locator('[data-action=withdraw]').click()
    assert page.evaluate('earningsSummary().available') == 0
    assert round(page.evaluate('state.balance') - balance, 2) == 180
    go('parcel/GJ2048')
    assert page.evaluate('state.space') == 'sender'  # opening a sender page switches back
    for label in ['parcelInfo', 'travelerTrip', 'addressesRecipient', 'priceDetail']:
        assert page.locator('.info-card h2', has_text=page.evaluate(f"t('{label}')")).count() == 1, label
    assert page.locator('.code-big b').count() == 4
    report['flows'].append('Sender/traveller spaces: switch, accept, pickup, coded handoff, decline, earnings transfer, full parcel detail')


    go('messages')
    page.locator('#chat-form input').fill('<script>alert(1)</script>')
    page.locator('#chat-form button').click()
    assert page.locator('.bubble.mine').last.inner_text().startswith('<script>')
    assert page.locator('.chat-body script').count() == 0
    report['flows'].append('Persistent message with HTML escaping')

    go('payments')
    page.locator('[data-action=add-card]').click()
    page.locator('#card-form > .btn').click()
    assert page.evaluate('state.cards[0].last4') == '4242'
    report['flows'].append('Test card with last-four-only storage')

    go('notifications')
    page.locator('[data-action=mark-all-read]').click()
    assert page.evaluate('state.notifications.every(n=>n.read)')
    go('settings')
    page.locator('[data-pref=dark]').check()
    assert page.locator('body').evaluate("el=>el.classList.contains('dark')")
    page.reload(wait_until='domcontentloaded')
    assert page.evaluate('state.profile.name') == 'Demo Tester'
    assert page.evaluate('state.addresses.length') == 1
    assert page.evaluate('state.bookings[0].status') == 'cancelled'
    report['flows'].append('Notification read state, dark mode and reload persistence')

    go('results')
    page.locator('[data-action=filters]').click()
    page.locator('#filters-form [name=maxPrice]').fill('100')
    page.locator('#filters-form [name=all]').check()
    page.locator('#filters-form button.btn').first.click()
    assert page.evaluate('filteredTrips().every(p=>p.price<=100)')
    page.locator('#sort').select_option('price')
    prices = page.evaluate('filteredTrips().map(p=>p.price)')
    assert prices == sorted(prices)
    assert 'google.com/maps' in page.locator('.results-map .gmap iframe').get_attribute('src')
    page.locator('.results-map [data-action=map-view][data-value=schematic]').click()
    assert page.locator('.results-map .interactive-map').is_visible()
    page.locator('[data-action=map-in]').click()
    assert page.locator('.interactive-map').get_attribute('data-zoom') == '1.25'
    page.locator('[data-action=map-reset]').click()
    assert page.locator('.interactive-map').get_attribute('data-zoom') == '1'
    page.locator('.results-map [data-action=map-view][data-value=google]').click()
    report['flows'].append('Route filters, price sorting, Google Maps / schematic switch and map zoom/reset')

    go('detail/T4')
    src = page.locator('.route-map .gmap iframe').get_attribute('src')
    assert 'saddr=Casablanca' in src and 'daddr=Marrakech' in src, src
    assert 'maps/dir/?api=1' in page.locator('.route-map .gmap-open').get_attribute('href')
    go('publish')
    page.locator('#publish-form [name=from]').select_option('Fès')
    page.locator('#publish-form [name=to]').select_option('Tanger')
    assert 'daddr=Tanger' in page.locator('#publish-map iframe').get_attribute('src')
    report['flows'].append('Google Maps routes on trip detail and live publish preview')

    go('profile')
    page.locator('[data-action=edit-profile]').click()
    page.locator('#profile-form [name=name]').fill('Demo Tester Updated')
    page.locator('#profile-form .btn').click()
    assert page.evaluate('state.profile.name') == 'Demo Tester Updated'
    go('addresses')
    page.locator('[data-action=edit-address]').click()
    page.locator('#address-form [name=street]').fill('24 avenue de test')
    page.locator('#address-form .btn').click()
    assert page.evaluate('state.addresses[0].street') == '24 avenue de test'
    report['flows'].append('Profile and saved address editing')

    go('security')
    page.locator('[name=password]').fill('temporary-secret-one')
    page.locator('[name=confirmation]').fill('temporary-secret-two')
    page.locator('#security-form .btn').click()
    assert page.locator('#toast').inner_text() == page.evaluate("t('passwordMismatch')")
    page.locator('[name=confirmation]').fill('temporary-secret-one')
    page.locator('#security-form .btn').click()
    assert page.locator('#toast').inner_text() == page.evaluate("t('passwordChecked')")
    assert 'temporary-secret' not in page.evaluate('JSON.stringify(localStorage)')
    report['flows'].append('Password mismatch and validation without storing credentials')

    go('report')
    page.locator('[name=subject]').fill('Test issue')
    page.locator('#support-form [name=description]').fill('Demo support request')
    page.locator('#support-form .btn').click()
    page.wait_for_url('**/#tickets')
    assert page.evaluate('state.tickets.length') == 1
    go('notification-settings')
    page.locator('[data-pref=tripAlerts]').uncheck()
    before = page.evaluate('state.notifications.length')
    page.evaluate("notify('tripAvailable','Test','results')")
    assert page.evaluate('state.notifications.length') == before
    report['flows'].append('Support issue persistence and notification preference enforcement')

    go('forgot')
    page.locator('[name=email]').fill('demo@example.com')
    page.locator('#forgot-form .btn').click()
    assert page.locator('#modal').is_visible()
    page.keyboard.press('Escape')
    assert not page.locator('#modal').is_visible()
    go('login')
    page.locator('[data-action=social][data-value=Google]').click()
    page.locator('[data-action=social-demo]').click()
    page.wait_for_url('**/#home')
    assert page.evaluate('state.session.provider') == 'Google'
    report['flows'].append('Recovery explanation, accessible modal close and Google demo entry')

    # A new booking waits for the traveller's acceptance (simulated reply).
    go('checkout/T1')
    page.locator('#checkout-form button.btn.wide').click()
    page.wait_for_url('**/#success/*')
    assert page.evaluate('state.bookings[0].status') == 'awaiting'
    page.evaluate('state.bookings[0].createdAt = Date.now() - 6000; simulateTravelerResponses()')
    assert page.evaluate('state.bookings[0].status') == 'reserved'
    assert page.evaluate('state.notifications[0].key') == 'requestAccepted'
    report['flows'].append('Booking waits for traveller acceptance, then is confirmed with a notification')

    # Public website (landing page at #welcome)
    go('welcome')
    assert page.locator('.site-header').is_visible()
    assert page.locator('.site-footer').is_visible()
    for section in ['how', 'routes', 'coverage', 'why', 'travel', 'safety', 'reviews', 'faq']:
        assert page.locator('#' + section).count() == 1, section
    page.locator('[data-action=coverage-city][data-value=Agadir]').click()
    assert 'Agadir' in page.locator('#coverage-map iframe').get_attribute('src')
    assert page.evaluate('search.from') == 'Agadir'
    page.locator('[data-action=landing-role][data-value=travel]').click()
    assert page.locator('#how-travel').is_visible()
    assert not page.locator('#how-send').is_visible()
    page.locator('[data-calc=parcels]').fill('4')
    page.locator('[data-calc=price]').fill('100')
    assert page.evaluate('calcTotal()') == 360  # 4 × 100 MAD minus the 10% fee
    # The total counts up smoothly; wait for the animation to land on the exact value.
    page.wait_for_function("document.querySelector('#calc-total').textContent === money(360)", timeout=3000)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('.site-burger').click()
    page.locator('#site-nav').wait_for(state='visible', timeout=2000)
    page.keyboard.press('Escape')
    assert not page.evaluate("document.body.classList.contains('menu-open')")
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.locator('.site-hero #search-form select[name=to]').select_option('Marrakech')
    page.locator('.site-hero #search-form .search-grid > .btn').click()
    page.wait_for_url('**/#results')
    assert page.evaluate('search.to') == 'Marrakech'
    report['flows'].append('Public website sections, role switch, earnings calculator, mobile menu and hero search')

    # Motion layer: live departures rotate, marquee scrolls, counters land on real values,
    # and reduced-motion visitors get a fully static, fully visible page.
    go('welcome')
    first = page.evaluate("[...document.querySelectorAll('.departures-card li')].findIndex(l => l.classList.contains('active'))")
    page.wait_for_timeout(2800)
    second = page.evaluate("[...document.querySelectorAll('.departures-card li')].findIndex(l => l.classList.contains('active'))")
    assert first != second, (first, second)
    x1 = page.evaluate("document.querySelector('.mq-track').getBoundingClientRect().x")
    page.wait_for_timeout(600)
    assert page.evaluate("document.querySelector('.mq-track').getBoundingClientRect().x") != x1
    page.mouse.wheel(0, 600)
    page.wait_for_function("[...document.querySelectorAll('.site-stats dt')].map(d => d.textContent).join() === ['8','3','4','0'].map(n => new Intl.NumberFormat(locale()).format(n)).join()", timeout=4000)
    still = browser.new_context(reduced_motion='reduce', locale='fr-FR')
    static_page = still.new_page()
    static_page.route('https://**/*', lambda route: route.abort())
    static_page.goto(URL, wait_until='domcontentloaded')
    static_page.wait_for_timeout(300)
    assert static_page.evaluate("[...document.querySelectorAll('.code-digits b, .hero-title .w > span')].every(e => getComputedStyle(e).opacity === '1')")
    assert static_page.evaluate("document.querySelectorAll('.reveal.pending').length") == 0
    still.close()
    report['flows'].append('Motion: rotating departures, marquee, counters and static reduced-motion mode')

    # Hero background video: plays muted, can be paused/resumed, never loads for reduced-motion visitors.
    page.set_viewport_size({'width': 1440, 'height': 1000})
    go('welcome')
    page.wait_for_function("document.querySelector('.hero-media').classList.contains('is-playing')", timeout=15000)
    assert page.evaluate("document.querySelector('#hero-video').muted")
    assert page.evaluate("document.querySelector('#hero-video').currentSrc.endsWith('hero-1280.webm')")
    page.locator('.video-toggle').click()
    assert page.evaluate("document.querySelector('#hero-video').paused")
    assert page.locator('.video-toggle').get_attribute('aria-pressed') == 'true'
    page.locator('.video-toggle').click()
    page.wait_for_function("!document.querySelector('#hero-video').paused", timeout=3000)
    still = browser.new_context(reduced_motion='reduce')
    static_page = still.new_page()
    static_page.goto(URL + '#welcome', wait_until='domcontentloaded')
    static_page.wait_for_timeout(500)
    assert static_page.evaluate("document.querySelector('#hero-video').currentSrc") == ''
    still.close()
    report['flows'].append('Hero background video: muted autoplay, pause/play control, skipped for reduced motion')

    for locale, expected in [('ar-MA', 'ar'), ('fr-FR', 'fr'), ('de-DE', 'en')]:
        ctx = browser.new_context(locale=locale)
        detect = ctx.new_page()
        detect.route('https://**/*', lambda route: route.abort())
        detect.goto(URL, wait_until='domcontentloaded')
        assert detect.evaluate('language') == expected, (locale, detect.evaluate('language'))
        assert detect.evaluate('document.documentElement.dir') == ('rtl' if expected == 'ar' else 'ltr')
        ctx.close()
    report['flows'].append('First-visit language follows the browser (ar / fr / English fallback)')

    # Capture a clean first-use experience, independent of the regression data.
    page.close()
    # Reduced motion keeps scroll-reveal sections visible in full-page screenshots.
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, locale='fr-FR', reduced_motion='reduce')
    page.route('https://**/*', lambda route: route.abort())
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='domcontentloaded')
    go('home')
    page.wait_for_function("[...document.images].every(i=>i.complete && i.naturalWidth>0)")
    page.evaluate('document.fonts.ready')
    page.screenshot(path=str(ARTIFACTS / 'desktop-home.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    go('home')
    page.screenshot(path=str(ARTIFACTS / 'mobile-home.png'), full_page=True)
    page.evaluate("setLanguage('ar')")
    go('profile')
    page.screenshot(path=str(ARTIFACTS / 'arabic-profile.png'), full_page=True)
    page.evaluate("setLanguage('fr')")
    page.set_viewport_size({'width': 1440, 'height': 1000})
    go('welcome')
    page.screenshot(path=str(ARTIFACTS / 'welcome.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    go('welcome')
    page.screenshot(path=str(ARTIFACTS / 'welcome-mobile.png'), full_page=True)
    page.evaluate("setLanguage('ar')")
    page.set_viewport_size({'width': 1440, 'height': 1000})
    go('welcome')
    page.screenshot(path=str(ARTIFACTS / 'welcome-arabic.png'))
    page.evaluate("setLanguage('fr')")
    browser.close()

report['errors'] = errors
(ARTIFACTS / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'screens':len(report['screens']),'flows':len(report['flows']),'overflows':report['overflows'],'errors':errors}, ensure_ascii=True))
assert not errors, errors
assert not report['overflows'], report['overflows']
