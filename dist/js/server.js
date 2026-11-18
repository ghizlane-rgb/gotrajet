/* GOTRAJET: connects the website to the real backend.
   Active only when the page is served by the backend (it sets window.GJ_SERVER).
   Opened as a plain file or from a static server, the site stays a local demo.
   The screens in app.js are reused as they are: this file swaps their data sources and actions. */
(() => {
  if (!window.GJ_SERVER) return;
  const SANDBOX = !!window.GJ_SERVER.sandbox;
  // Wording that changes when money is real
  phrase("withdraw", "Retirer mes gains", "Withdraw my earnings", "سحب أرباحي");
  phrase("earningsNote", "Gains après la commission GOTRAJET de 10 %. Ils sont versés dans votre solde à chaque livraison confirmée par code.", "Earnings after the 10% GOTRAJET fee. They reach your balance each time a delivery is confirmed with the code.", "الأرباح بعد عمولة GOTRAJET البالغة 10%. تُضاف إلى رصيدك عند كل تسليم مؤكد بالرمز.");
  const PUBLIC_PAGES = ["welcome", "onboarding", "login", "register", "forgot", "reset", "home", "results", "detail", "help", "about", "impact", "terms", "privacy", "directory"];
  const S = { me: null, trips: [], tripsAt: 0, earnings: {}, received: [], conversations: [], lastJson: "", ready: false };

  /* ---------- Cloudflare Turnstile (anti-robot check), only when the server has a site key ---------- */
  const TS_KEY = window.GJ_SERVER.turnstile || "";
  let tsLoading = null;
  function loadTurnstile() {
    if (!TS_KEY) return Promise.resolve(null);
    if (window.turnstile) return Promise.resolve(window.turnstile);
    tsLoading ??= new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
    return tsLoading;
  }
  function mountCaptcha() {
    if (!TS_KEY) return;
    document.querySelectorAll("#auth-form, #forgot-form, #otp-form").forEach((form) => {
      if (form.querySelector(".captcha")) return;
      const box = document.createElement("div");
      box.className = "captcha";
      form.querySelector("button.btn")?.before(box);
      loadTurnstile().then((ts) => {
        if (ts && box.isConnected) box.dataset.widget = ts.render(box, { sitekey: TS_KEY });
      });
    });
  }
  const captchaOf = (form) => form?.querySelector('[name="cf-turnstile-response"]')?.value || undefined;
  function resetCaptcha(form) {
    const w = form?.querySelector(".captcha")?.dataset.widget;
    if (w && window.turnstile) window.turnstile.reset(w);
  }

  /* ---------- API ---------- */
  async function api(path, { method = "GET", body, form } = {}) {
    const opts = { method, credentials: "same-origin", headers: {} };
    if (form) opts.body = form;
    else if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(path, opts);
    } catch {
      throw { status: 0, detail: "network" };
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && S.me && !path.startsWith("/api/auth/")) signedOut();
      const d = Array.isArray(data.detail) ? "invalid_value" : data.detail;
      throw { status: res.status, detail: d || "error" };
    }
    return data;
  }
  function fail(e) {
    if (e?.detail === "subscription_unpaid") return subscriptionModal(); // explains the fee + top-up button
    const key = "err_" + (e?.detail || "error");
    toast(COPY[key] ? t(key) : t("err_error"));
  }
  async function run(fn) {
    try {
      return await fn();
    } catch (e) {
      fail(e);
      return null;
    }
  }

  /* ---------- Local-only preferences (kept per device) ---------- */
  const LOCAL_KEYS = ["preferences", "favorites", "addresses", "cards", "defaultPayment", "space", "requests"];
  persist = function () {
    const keep = {};
    LOCAL_KEYS.forEach((k) => (keep[k] = state[k]));
    write("gj-server-local", keep);
  };
  Object.assign(state, read("gj-server-local", {}));
  state.addresses ??= [];
  state.favorites ??= [];
  state.cards ??= [];
  state.requests ??= [];

  /* ---------- Map server data into the shapes the screens already use ---------- */
  function applyBootstrap(b) {
    S.me = b.user;
    state.session = { server: true, userId: b.user.id };
    state.profile = { name: b.user.name, email: b.user.email, phone: b.user.phone, role: b.user.role };
    state.balance = b.wallet.balance;
    state.transactions = b.wallet.transactions;
    state.cashTopups = b.wallet.cashTopups;
    state.payouts = b.wallet.payouts;
    S.earnings = b.wallet.earnings;
    state.bookings = b.parcels;
    state.incoming = b.incoming;
    state.published = b.myTrips.map((p) => ({ ...p, vehicleModel: p.vehicleModel || t(p.vehicle) }));
    state.notifications = b.notifications;
    S.plan = b.plan;
    S.cancellations = b.cancellations || [];
    if (b.plan) {
      COMMISSION = b.plan.commissionRate;
      PLAN = { monthlyFee: b.plan.monthlyFee, cancelFeeRate: b.plan.cancelFeeRate, maxCancelsPerMonth: b.plan.maxCancelsPerMonth };
    }
    state.tickets = b.tickets.map((x) => ({ ...x, description: x.message }));
    state.reviews = b.reviews.given;
    S.received = b.reviews.received;
    S.conversations = b.conversations;
    S.verifiedTraveler = b.verifiedTraveler;
    const v = b.verification;
    state.verification = {
      phone: v.phone,
      id: v.id === "rejected" ? "missing" : v.id,
      photo: v.photo === "rejected" ? "missing" : v.photo,
      license: v.license === "rejected" ? "missing" : v.license,
      vehicle: v.vehicle === "rejected" ? "missing" : v.vehicle,
    };
    S.rejected = Object.keys(v).filter((k) => v[k] === "rejected");
  }
  async function refresh(force = false) {
    if (!S.me && !force) return false;
    let b;
    try {
      b = await api("/api/me/bootstrap");
    } catch (e) {
      if (e.status === 401) signedOut();
      return false;
    }
    const json = JSON.stringify(b);
    const changed = json !== S.lastJson;
    S.lastJson = json;
    applyBootstrap(b);
    if (!S.alertsLoaded) await loadAlerts();
    return changed;
  }
  async function loadAlerts() {
    try {
      S.alerts = (await api("/api/me/alerts")).alerts;
      S.alertsLoaded = true;
    } catch {
      S.alerts = S.alerts || [];
    }
  }
  async function loadTrips(force = false) {
    if (!force && Date.now() - S.tripsAt < 30000) return false;
    const { trips } = await api("/api/trips");
    const json = JSON.stringify(trips);
    const changed = json !== S.tripsJson;
    S.trips = trips;
    S.tripsJson = json;
    S.tripsAt = Date.now();
    return changed;
  }
  function signedOut() {
    S.me = null;
    S.lastJson = "";
    S.alerts = [];
    S.alertsLoaded = false;
    state.session = null;
    state.bookings = [];
    state.incoming = [];
    state.published = [];
    state.notifications = [];
    state.transactions = [];
    state.cashTopups = [];
    state.balance = 0;
  }

  /* ---------- Data functions used by the screens ---------- */
  const tripFromParcel = (p) => ({ id: p.tripId, name: p.name, from: p.from, to: p.to, date: p.date, time: p.time, price: p.price, rating: 0, reviews: 0, seats: 0, freeSeats: 0, weight: p.weight, vehicle: "", duration: "—", photo: 0 });
  allTrips = () => S.trips.filter((p) => p.travelerId !== S.me?.id);
  getTrip = (tid) =>
    S.trips.find((p) => p.id === tid) ||
    state.published.find((p) => p.id === tid) ||
    (state.bookings.find((p) => p.tripId === tid) && tripFromParcel(state.bookings.find((p) => p.tripId === tid)));
  freeSeats = (trip) => Number(trip.freeSeats ?? trip.seats ?? 0);
  allParcels = () => state.bookings;
  myTripsAll = () => state.published;
  incomingAll = () => state.incoming;
  changeParcel = () => {};
  changeTravel = () => {};
  simulateTravelerResponses = () => false;
  scheduleTravelerResponse = () => {};
  notify = () => {};
  transaction = () => {};
  earningsSummary = () => {
    const delivered = state.incoming.filter((r) => r.status === "delivered");
    return { delivered, total: S.earnings.total || 0, thisMonth: S.earnings.thisMonth || 0, pending: S.earnings.pending || 0, withdrawn: S.earnings.withdrawn || 0, available: S.earnings.available || 0 };
  };
  localNote = () =>
    SANDBOX ? `<div class="notice demo-notice">${icon("shield")}${t("sandboxNote")}</div>` : "";

  /* ---------- Traveller plan: the server takes the subscription and fees and enforces the limits ---------- */
  const basePlanState = planState;
  planState = () => S.plan || basePlanState();
  travelerCancellations = () => S.cancellations || [];
  takeSubscription = () => true; // checked by the server on publish / accept (402 → subscriptionModal)
  actions["pay-subscription"] = async () => {
    if (await run(() => api("/api/me/subscription/pay", { method: "POST" }))) {
      await afterChange();
      toast(fill("subscriptionTaken", { fee: money(PLAN.monthlyFee) }));
    }
  };
  actions["confirm-cancel-accepted"] = async (el) => {
    const res = await run(() => api(`/api/parcels/${el.dataset.value}/decline`, { method: "POST" }));
    if (!res) return;
    await afterChange();
    toast(fill("cancelDoneT", { fee: money(res.cancelFee || 0) }));
  };
  submits["claim-form"] = async (form) => {
    const reason = new FormData(form).get("reason").trim();
    if (await run(() => api(`/api/me/cancellations/${encodeURIComponent(form.dataset.id)}/claim`, { method: "POST", body: { reason } }))) {
      await afterChange();
      toast(t("claimSentT"));
    }
  };

  /* ---------- Route alerts (stored on the account; the server notifies when a matching trip is published) ---------- */
  routeAlerts = () => S.alerts || [];
  actions["alert-add"] = async (el) => {
    if (!S.me) {
      sessionStorage.setItem("gj-after-login", location.hash);
      toast(t("alertNeedsAccount"));
      return go("login");
    }
    const [from, to] = el.dataset.value.split("|");
    const res = await run(() => api("/api/me/alerts", { method: "POST", body: { from, to } }));
    if (!res) return;
    S.alerts = [...routeAlerts().filter((a) => a.id !== res.alert.id), res.alert];
    toast(t("alertSaved"));
    render();
  };
  actions["alert-remove"] = async (el) => {
    const [from, to] = el.dataset.value.split("|");
    const a = routeAlerts().find((x) => x.from === from && x.to === to);
    if (!a || !(await run(() => api(`/api/me/alerts/${encodeURIComponent(a.id)}`, { method: "DELETE" })))) return;
    S.alerts = routeAlerts().filter((x) => x.id !== a.id);
    toast(t("alertRemoved"));
    render();
  };

  /* ---------- Sign-in guard ---------- */
  const baseRender = render;
  render = function () {
    const page = location.hash.slice(1).split("/")[0] || "welcome";
    if (!S.ready) return;
    if (!S.me && pages[page] && !PUBLIC_PAGES.includes(page)) {
      sessionStorage.setItem("gj-after-login", location.hash);
      location.hash = "#login";
      return;
    }
    baseRender();
    mountCaptcha();
    if (["results", "detail", "home", "checkout", "welcome"].includes(page))
      loadTrips().then((changed) => changed && rerenderIfIdle()).catch(() => {});
  };
  function rerenderIfIdle() {
    const typing = document.activeElement?.matches?.("input, textarea, select");
    if ($("#modal").hidden && !typing) baseRender();
    else updateChrome();
  }
  async function afterChange(target) {
    await refresh();
    closeModal();
    if (target) go(target);
    else render();
  }

  /* ---------- Accounts ---------- */
  async function signIn(body, form) {
    try {
      return await api(body.name ? "/api/auth/register" : "/api/auth/login", { method: "POST", body });
    } catch (e) {
      resetCaptcha(form);
      if (e.detail === "otp_required") {
        S.pendingLogin = body;
        modal(`<h2>${t("twoFactor")}</h2><p>${t("twoFactorSub")}</p><form id="otp-form">${field(t("smsCode"), "otp", "", "text", 'required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code"')}<button class="btn wide">${t("confirm")}</button></form>`);
        mountCaptcha();
        return null;
      }
      fail(e);
      return null;
    }
  }
  async function afterSignIn(registering) {
    await refresh(true);
    closeModal();
    const next = sessionStorage.getItem("gj-after-login");
    sessionStorage.removeItem("gj-after-login");
    location.hash = next && next !== "#login" ? next : state.space === "traveler" ? "#space-traveler" : "#space-sender";
    render();
    if (registering) phoneModal();
  }
  submits["auth-form"] = async (form) => {
    const d = Object.fromEntries(new FormData(form));
    const registering = form.dataset.kind === "register";
    const captcha = captchaOf(form);
    const body = registering
      ? { name: d.name.trim(), email: d.email, phone: d.phone, password: d.password, role: d.role || "individual", captcha }
      : { email: d.email, password: d.password, captcha };
    if (await signIn(body, form)) await afterSignIn(registering);
  };
  submits["otp-form"] = async (form) => {
    const body = { ...S.pendingLogin, otp: new FormData(form).get("otp"), captcha: captchaOf(form) };
    if (await signIn(body, form)) {
      S.pendingLogin = null;
      await afterSignIn(false);
    }
  };
  actions.social = (el) => modal(`<h2>${esc(el.dataset.value)}</h2><p>${t("socialSoon")}</p>${btn(t("login"), "login")}`);
  actions["social-demo"] = actions.social;
  actions["confirm-logout"] = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    signedOut();
    go("welcome");
  };
  submits["forgot-form"] = async (form) => {
    const res = await run(() => api("/api/auth/password/forgot", { method: "POST", body: { email: new FormData(form).get("email"), captcha: captchaOf(form) } }));
    if (!res) return resetCaptcha(form);
    modal(`<h2>${t("resetPassword")}</h2><p>${t("resetSent")}</p>${res.devToken ? `<div class="notice">${t("devOnly")} <a href="#reset/${esc(res.devToken)}">${t("resetPassword")}</a></div>` : ""}`);
  };
  pages.reset = () =>
    `<section class="auth-card standalone">${languagePicker()}<h1>${t("resetPassword")}</h1><form id="reset-form">${field(t("newPassword"), "password", "", "password", 'required minlength="8" autocomplete="new-password"')}${field(t("confirmPassword"), "confirmation", "", "password", 'required minlength="8" autocomplete="new-password"')}<button class="btn wide">${t("save")}</button></form></section>`;
  submits["reset-form"] = async (form) => {
    const d = Object.fromEntries(new FormData(form));
    if (d.password !== d.confirmation) return toast(t("passwordMismatch"));
    if (await run(() => api("/api/auth/password/reset", { method: "POST", body: { token: route.param, password: d.password } }))) {
      toast(t("passwordChanged"));
      go("login");
    }
  };
  submits["security-form"] = (form) => {
    const d = Object.fromEntries(new FormData(form));
    if (d.password.length < 8 || d.password !== d.confirmation) return toast(t("passwordMismatch"));
    S.newPassword = d.password;
    modal(`<h2>${t("changePassword")}</h2><form id="current-password-form">${field(t("currentPassword"), "current", "", "password", 'required autocomplete="current-password"')}<button class="btn wide">${t("save")}</button></form>`);
  };
  submits["current-password-form"] = async (form) => {
    const current = new FormData(form).get("current");
    if (await run(() => api("/api/auth/password/change", { method: "POST", body: { current, password: S.newPassword } }))) {
      closeModal();
      $("#security-form")?.reset();
      toast(t("passwordChanged"));
    }
  };
  submits["profile-form"] = async (form) => {
    const d = Object.fromEntries(new FormData(form));
    const before = S.me.phone;
    if (!(await run(() => api("/api/me", { method: "PATCH", body: { name: d.name, phone: d.phone, role: d.role } })))) return;
    await afterChange();
    toast(t("savedServer"));
    if (S.me.phone !== before) phoneModal();
  };

  /* Phone verification by SMS code */
  async function phoneModal() {
    const res = await run(() => api("/api/auth/phone/send-code", { method: "POST" }));
    if (!res) return;
    if (res.alreadyVerified) return toast(t("verified"));
    modal(`<h2>${t("verifyPhone")}</h2><p>${t("codeSentTo")} <b dir="ltr">${esc(res.phone)}</b></p>${res.devCode ? `<div class="notice">${t("devOnly")} <b dir="ltr">${esc(res.devCode)}</b></div>` : ""}<form id="phone-code-form">${field(t("smsCode"), "code", "", "text", 'required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code"')}<button class="btn wide">${t("confirm")}</button></form><button class="text-link" data-action="resend-code">${t("resendCode")}</button>`);
  }
  actions["resend-code"] = phoneModal;
  submits["phone-code-form"] = async (form) => {
    if (await run(() => api("/api/auth/phone/verify", { method: "POST", body: { code: new FormData(form).get("code") } }))) {
      await afterChange();
      toast(t("phoneVerified"));
    }
  };

  /* ---------- Verification documents ---------- */
  const baseUpload = actions["upload-doc"];
  actions["upload-doc"] = (el) => (el.dataset.value === "phone" ? phoneModal() : baseUpload(el));
  submits["doc-form"] = async (form) => {
    const fd = new FormData(form);
    fd.append("kind", form.dataset.doc);
    if (await run(() => api("/api/verification/docs", { method: "POST", form: fd }))) {
      await afterChange();
      toast(t("docSubmittedServer"));
    }
  };

  /* ---------- Sender: booking ---------- */
  confirmBooking = function (form) {
    const p = getTrip(form.dataset.trip);
    if (!p) return;
    const d = Object.fromEntries(new FormData(form));
    S.booking = {
      tripId: p.id,
      quantity: Number(d.quantity),
      weight: Number(d.weight),
      insurance: form.elements.insurance.checked,
      payment: d.payment === "wallet" ? "wallet" : "card",
    };
    if (!["wallet", "card"].includes(d.payment)) toast(t("paymentLimited"));
    const fromDraft = draft.tripId === p.id;
    // On a longer trip ("along the way"), the handoff cities are the sender's, not the trip's ends.
    const seg = fromDraft ? { from: draft.from, to: draft.to } : { from: search.from, to: search.to };
    const along = tripServes(p.from, p.to, seg.from, seg.to) === "along";
    const content = fromDraft ? draft.content : t(search.size);
    modal(`<h2>${t("recipient")}</h2>${along ? `<div class="notice along-notice">${matchChip(p, seg.from, seg.to)}<span>${t("alongTip")}</span></div>` : ""}<form id="booking-details-form"><div class="form-grid">${field(t("recipient"), "recipient", fromDraft ? draft.recipient : "", "text", 'required minlength="2" maxlength="80"')}${field(t("phone"), "recipientPhone", fromDraft ? draft.phone : "", "tel", 'required maxlength="30"')}${field(t("pickup"), "pickup", fromDraft ? draft.pickup : along ? seg.from + " · " : "", "text", 'maxlength="200"')}${field(t("dropoff"), "dropoff", fromDraft ? draft.dropoff : along ? seg.to + " · " : "", "text", 'maxlength="200"')}${field(t("content"), "content", content, "text", 'required maxlength="200" data-risk="booking-risk" aria-describedby="booking-risk"')}</div><div id="booking-risk" aria-live="polite">${riskBox(content)}</div><label class="check-label"><input type="checkbox" name="acceptRules" required>${t("rulesConfirm")}</label><p class="map-note">${t("prohibitedList")}</p><button class="btn wide">${t("confirm")} · ${money(Number(p.price) * S.booking.quantity + (S.booking.insurance ? 10 * S.booking.quantity : 0))}</button></form>`);
  };
  submits["checkout-form"] = (form) => confirmBooking(form);
  submits["booking-details-form"] = async (form) => {
    const d = Object.fromEntries(new FormData(form));
    if (contentRisk(d.content).level === "block") {
      form.elements.content.focus();
      return toast(t("riskBlocked"));
    }
    const fromDraft = draft.tripId === S.booking.tripId;
    const body = {
      ...S.booking,
      recipient: d.recipient.trim(),
      recipientPhone: d.recipientPhone,
      pickup: d.pickup,
      dropoff: d.dropoff,
      content: d.content,
      acceptRules: !!d.acceptRules,
      type: fromDraft ? draft.type || "small" : search.size || "small",
      notes: fromDraft ? draft.notes || "" : "",
      length: fromDraft && draft.length ? Number(draft.length) : null,
      width: fromDraft && draft.width ? Number(draft.width) : null,
      height: fromDraft && draft.height ? Number(draft.height) : null,
      value: fromDraft && draft.value ? Number(draft.value) : 0,
    };
    if (!["documents", "small", "medium", "large"].includes(body.type)) body.type = "small";
    const res = await run(() => api("/api/parcels", { method: "POST", body }));
    if (!res) return;
    if (fromDraft) {
      draft.step = 1;
      draft.tripId = "";
      write("gj-draft", draft);
    }
    S.tripsAt = 0;
    await afterChange("success/" + res.parcel.id);
  };
  actions["confirm-cancel"] = async (el) => {
    if (await run(() => api(`/api/parcels/${el.dataset.value}/cancel`, { method: "POST" }))) {
      await afterChange();
      toast(t("refundedServer"));
    }
  };
  actions.handoff = (el) => {
    const p = getParcel(el.dataset.value);
    if (!p) return;
    modal(`<h2>${t("code")}</h2><div class="code-big">${String(p.code).split("").map((x) => `<b>${esc(x)}</b>`).join("")}</div><p>${t("handoffServer")}</p>`);
  };

  /* ---------- Traveller ---------- */
  submits["publish-form"] = async (form) => {
    const d = Object.fromEntries(new FormData(form));
    if (d.from === d.to) return toast(t("sameCity"));
    if (new Date(d.date + "T" + d.time).getTime() <= Date.now()) return toast(t("dateError"));
    const body = { from: d.from, to: d.to, date: d.date, time: d.time, price: Number(d.price), seats: Number(d.seats), weight: Number(d.weight), vehicle: d.vehicle || "car", vehicleModel: d.vehicleModel || "", pickup: d.pickup || "", dropoff: d.dropoff || "", notes: d.notes || "" };
    try {
      await api("/api/trips", { method: "POST", body });
    } catch (e) {
      if (e.detail === "traveler_not_verified") {
        toast(t("err_traveler_not_verified"));
        return go("verification");
      }
      return fail(e);
    }
    S.tripsAt = 0;
    tripTab = "upcoming";
    await afterChange("trips");
    toast(t("tripSaved"));
  };
  const parcelAction = (action, done) => async (el) => {
    if (await run(() => api(`/api/parcels/${el.dataset.value}/${action}`, { method: "POST" }))) {
      await afterChange();
      toast(t(done));
    }
  };
  actions["accept-request"] = parcelAction("accept", "requestAcceptedT");
  actions["confirm-decline"] = parcelAction("decline", "requestDeclinedT");
  actions["pickup-request"] = parcelAction("pickup", "pickupConfirmed");
  actions["deliver-request"] = (el) => {
    const r = getIncoming(el.dataset.value);
    if (!r) return;
    modal(`<h2>${t("confirmDelivery")}</h2><p>${esc(r.sender)} → ${esc(r.recipient)} · #${esc(r.id)}</p><div class="notice">${t("askRecipientCode")}</div><form id="request-handoff-form" data-id="${esc(r.id)}">${field(t("recipientCode"), "code", "", "text", 'required inputmode="numeric" pattern="[0-9]{4}" maxlength="4"')}<button class="btn wide">${t("confirmDelivery")}</button></form>`);
  };
  submits["request-handoff-form"] = async (form) => {
    const r = getIncoming(form.dataset.id);
    if (!(await run(() => api(`/api/parcels/${form.dataset.id}/deliver`, { method: "POST", body: { code: new FormData(form).get("code") } })))) return;
    await afterChange();
    toast(t("earnedToast") + money(r?.net ?? netOf(r?.price || 0)));
  };
  actions["trip-advance"] = async (el) => {
    const trip = getMyTrip(el.dataset.value);
    if (!trip || trip.status === "completed") return;
    const step = trip.status === "upcoming" ? "start" : "complete";
    if (await run(() => api(`/api/trips/${trip.id}/${step}`, { method: "POST" }))) {
      tripTab = step === "start" ? "inProgress" : "completed";
      await afterChange();
    }
  };
  const baseConfirmDelete = actions["confirm-delete"];
  actions["confirm-delete"] = async (el) => {
    if (el.dataset.kind !== "trip") return baseConfirmDelete(el);
    if (await run(() => api(`/api/trips/${el.dataset.value}`, { method: "DELETE" }))) {
      S.tripsAt = 0;
      await afterChange();
    }
  };
  actions.withdraw = () => {
    const e = earningsSummary();
    if (e.available <= 0) return toast(t("empty"));
    modal(`<h2>${t("withdraw")} · ${money(e.available)}</h2><form id="payout-form"><fieldset class="topup-methods"><legend>${t("payoutMethod")}</legend><label class="payment-option"><input type="radio" name="method" value="bank" checked>${icon("card")}<span>${t("bankTransfer")}</span></label><label class="payment-option"><input type="radio" name="method" value="cash">${icon("wallet")}<span>${t("cashAgencyPayout")}</span></label></fieldset>${field(t("payoutDetails"), "details", "", "text", 'required maxlength="200" placeholder="RIB / Cash Plus"')}<p class="map-note">${t("payoutNote")}</p><button class="btn wide">${t("confirm")}</button></form>`);
  };
  submits["payout-form"] = async (form) => {
    const d = Object.fromEntries(new FormData(form));
    if (await run(() => api("/api/wallet/payouts", { method: "POST", body: { method: d.method, details: d.details } }))) {
      await afterChange();
      toast(t("payoutRequestedT"));
    }
  };

  /* ---------- Wallet ---------- */
  submits["topup-form"] = async (form) => {
    const d = new FormData(form),
      amount = Number(d.get("amount")),
      network = d.get("method");
    if (CASH_NETWORKS.includes(network)) {
      const res = await run(() => api("/api/wallet/cash-topups", { method: "POST", body: { amount, network } }));
      if (!res) return;
      await refresh();
      render();
      return modal(cashTopupView(state.cashTopups.find((c) => c.id === res.topup.id) || res.topup));
    }
    if (await run(() => api("/api/wallet/card-topup", { method: "POST", body: { amount } }))) {
      await afterChange();
      toast(t("topupNote"));
    }
  };
  actions["cash-pay"] = async (el) => {
    if (await run(() => api(`/api/wallet/cash-topups/${el.dataset.value}/simulate-paid`, { method: "POST" }))) {
      await afterChange();
      toast(t("cashPaid"));
    }
  };
  actions["cash-cancel"] = async (el) => {
    if (await run(() => api(`/api/wallet/cash-topups/${el.dataset.value}/cancel`, { method: "POST" }))) await afterChange();
  };
  const baseCashView = cashTopupView;
  cashTopupView = (c) => {
    let html = baseCashView(c);
    if (!SANDBOX) html = html.replace(/<div class="notice">[\s\S]*?<\/div>/, "").replace(/<button class="btn" data-action="cash-pay"[\s\S]*?<\/button>/, "");
    else html = html.replace(t("cashDemo"), t("cashSandbox"));
    return html;
  };

  /* ---------- Chat ---------- */
  let activeContact = "";
  pages.messages = function () {
    const list = S.conversations.filter((c) => messageTab === "all" || c.type === messageTab);
    if (!list.some((c) => c.userId === activeContact)) activeContact = list[0]?.userId || "";
    const c = S.conversations.find((x) => x.userId === activeContact);
    const last = (x) => x.messages.at(-1)?.text || t("noMessagesYet");
    return (
      head("messages", t("onboard3Sub")) +
      tabs(["all", "travelers", "senders", "support"], messageTab, "message-tab") +
      (list.length
        ? `<div class="messages-layout"><div class="conversations">${list.map((x) => `<button class="conversation ${x.userId === activeContact ? "active" : ""}" data-action="open-chat" data-value="${esc(x.userId)}">${avatar(x.name)}<span><b>${esc(x.name)}${x.unread ? ` <span class="badge">${x.unread}</span>` : ""}</b><small>${esc(last(x))}</small></span></button>`).join("")}</div><section class="chat"><div class="chat-header">${avatar(c.name)}<span>${esc(c.name)}</span></div><div class="chat-body" aria-live="polite">${c.messages.length ? c.messages.map((m) => `<div class="bubble ${m.mine ? "mine" : ""}">${esc(m.text)}<small>${new Date(m.at).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}</small></div>`).join("") : `<p class="muted">${t("noMessagesYet")}</p>`}</div><form id="chat-form" class="chat-form"><input class="chat-input" name="message" aria-label="${t("writeMessage")}" placeholder="${t("writeMessage")}" required maxlength="1000"><button class="btn blue" aria-label="${t("sendMessage")}">${icon("arrow")}</button></form></section></div>`
        : empty(btn(t("search"), "results"))) +
      `<p class="map-note">${t("chatNoteServer")}</p>`
    );
  };
  actions["open-chat"] = async (el) => {
    activeContact = el.dataset.value;
    render();
    await api(`/api/messages/${encodeURIComponent(activeContact)}/read`, { method: "POST" }).catch(() => {});
    if (await refresh()) rerenderIfIdle();
  };
  actions["contact-traveler"] = (el) => {
    const c = S.conversations.find((x) => x.name === el.dataset.value);
    if (c) activeContact = c.userId;
    messageTab = "all";
    go("messages");
  };
  submits["chat-form"] = async (form) => {
    const body = new FormData(form).get("message").trim();
    if (!body || !activeContact) return;
    if (!(await run(() => api("/api/messages", { method: "POST", body: { to: activeContact, body } })))) return;
    await refresh();
    render();
    $('#chat-form [name="message"]')?.focus();
    const chatBody = $(".chat-body");
    if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
  };

  /* ---------- Notifications ---------- */
  actions["mark-all-read"] = async () => {
    await run(() => api("/api/notifications/read", { method: "POST", body: {} }));
    await afterChange();
  };
  actions["read-notification"] = async (el) => {
    const n = state.notifications.find((x) => x.id === el.dataset.value);
    api("/api/notifications/read", { method: "POST", body: { id: el.dataset.value } }).then(refresh).catch(() => {});
    if (n) {
      n.read = true;
      go(n.target || "notifications");
    }
  };

  /* ---------- Reviews ---------- */
  pages.reviews = function () {
    const list = reviewTab === "received" ? S.received : state.reviews;
    return (
      head("reviews", t("evaluateSub")) +
      tabs(["given", "received"], reviewTab, "review-tab") +
      (list.length
        ? list.map((r) => panel(`<div class="section-heading"><div class="traveler-row">${avatar(r.name)}<h3>${esc(r.name)}</h3></div>${stars(r.rating)}</div>${r.comment ? `<p>${esc(r.comment)}</p>` : ""}<small>#${esc(r.parcelId)} · ${esc(r.route)} · ${dateText(r.date)}</small>`)).join("")
        : panel(`<p class="muted">${t("empty")}</p>`))
    );
  };
  submits["review-form"] = async (form) => {
    if (ratingValue < 1 || ratingValue > 5) return toast(t("chooseStars"));
    const comment = new FormData(form).get("comment")?.trim() || "";
    if (!(await run(() => api(`/api/parcels/${form.dataset.parcel}/review`, { method: "POST", body: { rating: ratingValue, comment } })))) return;
    ratingValue = 0;
    reviewTab = "given";
    await afterChange("reviews");
    toast(t("reviewSaved"));
  };

  /* ---------- Support & disputes ---------- */
  submits["support-form"] = async (form) => {
    const d = Object.fromEntries(new FormData(form));
    if (!(await run(() => api("/api/support", { method: "POST", body: { topic: route.page, subject: d.subject || "", message: d.description || "" } })))) return;
    await afterChange("tickets");
    toast(t("supportSaved"));
  };
  actions["open-dispute"] = (el) =>
    modal(`<h2>${t("reportProblem")}</h2><p>${t("disputeSub")}</p><form id="dispute-form" data-id="${esc(el.dataset.value)}"><label class="form-label">${t("disputeReason")}<textarea name="reason" required minlength="10" maxlength="2000" rows="4"></textarea></label><button class="btn danger wide">${t("send")}</button></form>`);
  submits["dispute-form"] = async (form) => {
    if (await run(() => api(`/api/parcels/${form.dataset.id}/dispute`, { method: "POST", body: { reason: new FormData(form).get("reason") } }))) {
      await afterChange();
      toast(t("disputeOpened"));
    }
  };
  // "Report a problem" button on parcel and request pages
  const withDispute = (fn, getter) => () => {
    let html = fn();
    const item = getter(route.param);
    if (item && !["cancelled", "declined"].includes(item.status) && !(item.dispute && item.dispute.status === "open"))
      html += `<div class="detail-actions">${`<button class="btn outline" data-action="open-dispute" data-value="${esc(item.id)}">${icon("shield")}${t("reportProblem")}</button>`}</div>`;
    else if (item?.dispute?.status === "open") html += `<div class="notice">${t("disputeInProgress")}</div>`;
    return html;
  };
  pages.parcel = withDispute(pages.parcel, (id) => getParcel(id));
  pages.request = withDispute(pages.request, (id) => getIncoming(id));

  /* ---------- Local reset = sign out on this device ---------- */
  actions["confirm-reset"] = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    ["gj-v2", "gj-server-local", "gj-draft", "gj-sample-updates"].forEach((k) => localStorage.removeItem(k));
    location.href = location.pathname + "#welcome";
    location.reload();
  };

  /* ---------- Start ---------- */
  setInterval(async () => {
    if (!S.me || document.visibilityState !== "visible") return;
    if (await refresh()) rerenderIfIdle();
  }, 10000);
  window.addEventListener("focus", async () => {
    if (S.me && (await refresh())) rerenderIfIdle();
  });
  (async () => {
    state.bookings = [];
    state.incoming = [];
    state.published = [];
    state.notifications = [];
    state.transactions = [];
    state.cashTopups = [];
    state.payouts = [];
    state.reviews = [];
    state.tickets = [];
    state.balance = 0;
    await Promise.all([refresh(true), loadTrips(true).catch(() => {})]);
    S.ready = true;
    render();
  })();
  window.GJ = { api, refresh, S }; // handy for debugging in the console
})();
