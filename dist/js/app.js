/* GOTRAJET — complete browser-local product demo. No real authentication or payments. */
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    toast("Storage unavailable / Stockage indisponible");
  }
}
const paths = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  box: "m12 3 9 5v9l-9 5-9-5V8Zm-9 5 9 5 9-5M12 13v9M7.5 5.5l9 5V15",
  route:
    "M5 6a2 2 0 1 0 0 .1M19 18a2 2 0 1 0 0 .1M7 6h8a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h8",
  plus: "M12 5v14M5 12h14",
  chat: "M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5ZM8 10h.01M12 10h.01M16 10h.01",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 22v-3a8 8 0 0 1 16 0v3",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  calendar: "M4 5h16v16H4ZM8 2v6M16 2v6M4 11h16M8 15h2M14 15h2",
  wallet: "M21 8H4V4h14v4M4 8v13h17V8Zm12 4h5v5h-5ZM17 14.5h.1",
  shield: "M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6ZM8 12l3 3 5-6",
  leaf: "M21 3C10 1 1 5 4 15c5 10 18 2 17-12ZM3 22 17 8",
  star: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z",
  heart: "M20 4c-4-4-8 1-8 1S8 0 4 4c-7 7 8 17 8 17S27 11 20 4Z",
  search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 7 7",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 3",
  car: "m3 10 2-6h14l2 6M2 10h20v8H2ZM5 18v3M19 18v3M6 14h.1M18 14h.1",
  settings:
    "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM10 2h4l1 3 3 1 3 3-2 3 1 3-3 3-3-1-2 3-4-1-1-3-3-1-1-4 2-2V7l3-2Z",
  help: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM9 8a3 3 0 1 1 4 3c-1 1-1 1-1 3M12 17h.01",
  check: "m5 12 5 5L20 7",
  globe:
    "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM2 12h20M12 2c-6 6-6 14 0 20 6-6 6-14 0-20",
  logout: "M9 3H3v18h6M9 12h13m-5-5 5 5-5 5",
  card: "M2 5h20v15H2ZM2 9h20M5 16h4",
  filter: "M3 5h18M6 12h12M9 19h6",
  sun: "M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10ZM12 1v2M12 21v2M1 12h2M21 12h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Zm14 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  pause: "M9 5v14M15 5v14",
  play: "M7 4.5v15l12.5-7.5Z",
};
function icon(name, cls = "") {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.box}"/></svg>`;
}
const brand = () =>
  `<span class="brand-mark"><svg viewBox="0 0 64 50" fill="none" aria-hidden="true"><path d="M48 6H30C17 6 10 15 10 26s8 19 20 19h16V26H31" stroke="currentColor" stroke-width="8"/><path d="M3 17h18M0 25h17M4 33h13" stroke="currentColor" stroke-width="3"/><path d="m46 12 15 8v17l-15 8-15-8V20Z" fill="#ff8616"/><path d="m31 20 15 8 15-8M46 28v17M38 16l16 8" stroke="#ffe3b8" stroke-width="1.5"/></svg></span><b>GOTRA<span>JET</span></b>`;
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
function futureDate(days = 1) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
}
function dateText(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString(locale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function money(n) {
  return (
    new Intl.NumberFormat(locale(), { maximumFractionDigits: 2 }).format(
      Number(n),
    ) + " MAD"
  );
}
function id(prefix) {
  return (
    prefix +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 5).toUpperCase()
  );
}
let state = read("gj-v2", null);
if (!state) {
  state = {
    profile: read("gj-profile", {
      name: "Ikram Slimani",
      email: "ikram@example.com",
      phone: "+212 600 000 000",
      role: "individual",
    }),
    session: null,
    bookings: [],
    requests: [],
    published: read("gj-trips", []).map((p) => ({
      ...p,
      id: id("TR"),
      status: "upcoming",
    })),
    favorites: [],
    reviews: [],
    messages: read("gj-messages", {}),
    addresses: [],
    cards: [],
    balance: 250,
    transactions: [],
    tickets: [],
    preferences: {
      dark: false,
      deliveryAlerts: true,
      messageAlerts: true,
      tripAlerts: true,
    },
    notifications: [
      {
        id: "N1",
        key: "onRoad",
        body: "Casablanca → Rabat · #GJ2048",
        read: false,
        target: "tracking/GJ2048",
      },
      {
        id: "N2",
        key: "newMessage",
        body: "Youssef B.",
        read: false,
        target: "messages",
      },
      {
        id: "N3",
        key: "tripAvailable",
        body: "Casablanca → Marrakech",
        read: true,
        target: "results",
      },
      {
        id: "N4",
        key: "paymentConfirmed",
        body: "120 MAD",
        read: true,
        target: "wallet",
      },
    ],
  };
  persist();
}
state.space ??= "sender";
state.incoming ??= [];
state.travelUpdates ??= {};
state.payouts ??= [];
state.verification ??= { id: "verified", phone: "verified", photo: "verified", license: "missing", vehicle: "missing" };
state.cashTopups ??= [];

/* ---------- Simulated cash top-up at a payment agency (Cash Plus, Wafacash, …) ----------
   The app issues a reference, the user pays cash at an agency, the agency confirms and the
   wallet is credited. Here the agency confirmation is a demo button: no agency receives it. */
const CASH_NETWORKS = ["Cash Plus", "Wafacash", "Barid Cash", "Damane Cash"];
const CASH_MIN = 20,
  CASH_MAX = 5000,
  CASH_TTL_MS = 48 * 3600 * 1000;
function cashReference() {
  let ref = "";
  for (let i = 0; i < 10; i++) ref += Math.floor(Math.random() * 10);
  return ref;
}
function cashStatus(c) {
  return c.status === "pending" && Date.now() > c.expires ? "expired" : c.status;
}
function cashDateTime(ms) {
  return new Date(ms).toLocaleString(locale(), { dateStyle: "medium", timeStyle: "short" });
}
function cashTopupView(c) {
  const status = cashStatus(c),
    ref = c.ref.replace(/(\d{4})(\d{4})(\d{2})/, "$1 $2 $3");
  return `<h2>${t("cashTitle")}</h2><p>${t("cashIntro")}</p>
<div class="cash-ticket"><span>${esc(c.network)} · ${badge(status)}</span><small>${t("cashRef")}</small><strong class="cash-ref" dir="ltr">${esc(ref)}</strong><div class="cash-meta"><span>${t("amount")}<b>${money(c.amount)}</b></span><span>${t("cashExpires")}<b>${cashDateTime(c.expires)}</b></span></div></div>
<ol class="cash-steps"><li>${t("cashStep1")}</li><li>${t("cashStep2")}</li><li>${t("cashStep3")}</li></ol>
<div class="notice">${t("cashDemo")}</div>
${status === "pending" ? `<div class="detail-actions"><button class="btn" data-action="cash-pay" data-value="${esc(c.id)}">${icon("check")}${t("cashSimulate")}</button><button class="btn outline" data-action="cash-cancel" data-value="${esc(c.id)}">${t("cashCancel")}</button></div>` : ""}`;
}
function persist() {
  write("gj-v2", state);
}
function notify(key, body, target) {
  const preference =
    key === "newMessage"
      ? "messageAlerts"
      : key === "tripAvailable"
        ? "tripAlerts"
        : "deliveryAlerts";
  if (state.preferences[preference] === false) return;
  state.notifications.unshift({ id: id("N"), key, body, read: false, target });
  persist();
}
const CITIES = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Agadir",
  "Fès",
  "Tanger",
  "Oujda",
  "Meknès",
];
const photos = [
  "assets/casablanca-coast.webp",
  "assets/marrakech.webp",
  "assets/fes.webp",
];
const BASE_TRIPS = [
  {
    id: "T1",
    name: "Youssef B.",
    from: "Casablanca",
    to: "Rabat",
    price: 50,
    time: "10:30",
    rating: 4.9,
    reviews: 128,
    seats: 3,
    weight: 10,
    vehicle: "Toyota Auris",
    duration: "1h 30",
    photo: 0,
    days: 1,
  },
  {
    id: "T2",
    name: "Salma E.",
    from: "Marrakech",
    to: "Agadir",
    price: 80,
    time: "08:00",
    rating: 4.8,
    reviews: 94,
    seats: 2,
    weight: 5,
    vehicle: "Renault Clio",
    duration: "3h 45",
    photo: 1,
    days: 1,
  },
  {
    id: "T3",
    name: "Amine K.",
    from: "Fès",
    to: "Tanger",
    price: 100,
    time: "14:00",
    rating: 4.7,
    reviews: 72,
    seats: 4,
    weight: 20,
    vehicle: "Peugeot Partner",
    duration: "4h 20",
    photo: 2,
    days: 1,
  },
  {
    id: "T4",
    name: "Youssef B.",
    from: "Casablanca",
    to: "Marrakech",
    price: 120,
    time: "08:00",
    rating: 4.9,
    reviews: 128,
    seats: 3,
    weight: 10,
    vehicle: "Toyota Auris",
    duration: "3h 30",
    photo: 1,
    days: 1,
  },
  {
    id: "T5",
    name: "Salma E.",
    from: "Casablanca",
    to: "Marrakech",
    price: 135,
    time: "09:30",
    rating: 4.8,
    reviews: 94,
    seats: 2,
    weight: 10,
    vehicle: "Renault Clio",
    duration: "3h 30",
    photo: 1,
    days: 1,
  },
  {
    id: "T6",
    name: "Amine K.",
    from: "Casablanca",
    to: "Marrakech",
    price: 110,
    time: "11:15",
    rating: 4.7,
    reviews: 72,
    seats: 4,
    weight: 5,
    vehicle: "Peugeot Partner",
    duration: "3h 45",
    photo: 1,
    days: 1,
  },
  {
    id: "T7",
    name: "Nadia R.",
    from: "Casablanca",
    to: "Marrakech",
    price: 145,
    time: "13:00",
    rating: 4.9,
    reviews: 61,
    seats: 2,
    weight: 20,
    vehicle: "Dacia Duster",
    duration: "3h 30",
    photo: 1,
    days: 1,
  },
  {
    id: "T8",
    name: "Salma E.",
    from: "Rabat",
    to: "Agadir",
    price: 150,
    time: "10:30",
    rating: 4.8,
    reviews: 94,
    seats: 3,
    weight: 10,
    vehicle: "Renault Clio",
    duration: "6h",
    photo: 2,
    days: 2,
  },
  {
    id: "T9",
    name: "Youssef B.",
    from: "Rabat",
    to: "Casablanca",
    price: 50,
    time: "09:30",
    rating: 4.9,
    reviews: 128,
    seats: 3,
    weight: 10,
    vehicle: "Toyota Auris",
    duration: "1h 30",
    photo: 0,
    days: 1,
  },
];
const sampleParcels = [
  {
    id: "GJ2048",
    from: "Casablanca",
    to: "Rabat",
    name: "Youssef B.",
    tripId: "T1",
    price: 50,
    quantity: 1,
    weight: 3,
    status: "transit",
    date: today(),
    time: "14:30",
    content: "Documents",
    code: "2048",
    type: "documents",
    length: 32,
    width: 23,
    height: 3,
    recipient: "Hind A.",
    recipientPhone: "+212 600 000 201",
    pickup: "18 boulevard d’Anfa, Casablanca",
    dropoff: "7 rue Patrice Lumumba, Rabat",
    notes: "Enveloppe A4, ne pas plier.",
    insurance: false,
    payment: "card",
  },
  {
    id: "GJ1984",
    from: "Marrakech",
    to: "Agadir",
    name: "Salma E.",
    tripId: "T2",
    price: 80,
    quantity: 1,
    weight: 2,
    status: "delivered",
    date: futureDate(-2),
    content: "Livres",
    code: "1984",
    type: "small",
    length: 30,
    width: 20,
    height: 15,
    recipient: "Rachid L.",
    recipientPhone: "+212 600 000 202",
    pickup: "Guéliz, avenue Mohammed V, Marrakech",
    dropoff: "Talborjt, Agadir",
    notes: "",
    insurance: true,
    payment: "wallet",
  },
  {
    id: "GJ1920",
    from: "Fès",
    to: "Tanger",
    name: "Amine K.",
    tripId: "T3",
    price: 100,
    quantity: 1,
    weight: 4,
    status: "delivered",
    date: futureDate(-5),
    content: "Vêtements",
    code: "1920",
    type: "medium",
    length: 45,
    width: 35,
    height: 25,
    recipient: "Imane T.",
    recipientPhone: "+212 600 000 203",
    pickup: "Fès el-Jadid, Fès",
    dropoff: "Boulevard Pasteur, Tanger",
    notes: "",
    insurance: false,
    payment: "mobileWallet",
  },
];
let sampleUpdates = read("gj-sample-updates", {});
function allParcels() {
  return [
    ...state.bookings,
    ...sampleParcels.map((p) => ({ ...p, ...sampleUpdates[p.id] })),
  ];
}
function getParcel(pid) {
  return allParcels().find((p) => p.id === pid);
}
function changeParcel(pid, updates) {
  const b = state.bookings.find((p) => p.id === pid);
  if (b) Object.assign(b, updates);
  else {
    sampleUpdates[pid] = { ...sampleUpdates[pid], ...updates };
    write("gj-sample-updates", sampleUpdates);
  }
  persist();
}
function allTrips() {
  return [
    ...BASE_TRIPS.map((p) => ({ ...p, date: futureDate(p.days) })),
    ...state.published
      .filter((p) => p.status !== "cancelled")
      .map((p) => ({
        ...p,
        name: state.profile.name,
        rating: 0,
        reviews: 0,
        photo: 0,
        duration: "—",
      })),
  ];
}
function getTrip(tid) {
  return allTrips().find((p) => p.id === tid);
}
function freeSeats(trip) {
  return (
    Number(trip.seats) -
    state.bookings
      .filter((b) => b.tripId === trip.id && b.status !== "cancelled")
      .reduce((sum, b) => sum + Number(b.quantity || 1), 0)
  );
}
let route = { page: "welcome", param: "" },
  search = {
    from: "Casablanca",
    to: "Rabat",
    size: "small",
    date: "",
    mode: "send",
  },
  filters = {
    maxPrice: "",
    minRating: 0,
    minSeats: 1,
    sort: "time",
    all: false,
  },
  draft = read("gj-draft", {
    step: 1,
    type: "small",
    length: 30,
    width: 20,
    height: 15,
    weight: 3,
    content: "",
    notes: "",
    from: "Casablanca",
    to: "Rabat",
    pickup: "",
    dropoff: "",
    recipient: "",
    phone: "",
    date: futureDate(1),
    tripId: "",
  }),
  reservation = { quantity: 1, insurance: false, payment: "card" },
  onboardingIndex = 0,
  parcelTab = "inProgress",
  tripTab = "upcoming",
  reviewTab = "given",
  messageTab = "all",
  notificationTab = "all",
  activeChat = "Youssef B.",
  ratingValue = 0;
let toastTimer, lastFocus;
function toast(msg) {
  $("#toast").textContent = msg;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3800);
}
function modal(html) {
  lastFocus = document.activeElement;
  $("#modal-content").innerHTML = html;
  $("#modal").hidden = false;
  $("#modal").setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  $("#close-modal").focus();
}
function closeModal() {
  $("#modal").hidden = true;
  $("#modal").setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  lastFocus?.focus?.();
}
function go(page, param = "") {
  const hash = "#" + page + (param ? "/" + encodeURIComponent(param) : "");
  closeModal();
  if (location.hash === hash) render();
  else location.hash = hash;
}
function btn(label, page, style = "blue", extra = "") {
  return `<button class="btn ${style}" data-go="${page}" ${extra}>${label}</button>`;
}
function field(label, name, value = "", type = "text", attrs = "") {
  return `<label class="form-label">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
}
function options(values, value) {
  return values
    .map(
      (v) =>
        `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(v)}</option>`,
    )
    .join("");
}
function cityField(label, name, value) {
  return `<label class="form-label">${label}<select name="${name}">${options(CITIES, value)}</select></label>`;
}
function head(key, sub = "", extra = "") {
  return `<div class="page-heading"><div><h1>${t(key)}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${extra}</div>`;
}
function panel(content, cls = "") {
  return `<section class="panel ${cls}">${content}</section>`;
}
function badge(status) {
  return `<span class="badge status-${status}">${t(status)}</span>`;
}
function localNote() {
  return `<div class="notice demo-notice">${icon("shield")}${t("demoNote")}</div>`;
}
function empty(action = "") {
  return panel(
    `<div class="empty">${icon("box")}<p>${t("empty")}</p>${action}</div>`,
  );
}
function tabs(keys, active, action) {
  return `<div class="tabs segment-tabs">${keys.map((k) => `<button class="tab ${active === k ? "active" : ""}" data-action="${action}" data-value="${k}">${t(k)}</button>`).join("")}</div>`;
}
function avatar(name, cls = "") {
  return `<span class="avatar ${cls}">${esc(
    name
      ?.split(" ")
      .map((x) => x[0])
      .slice(0, 2)
      .join("") || "G",
  )}</span>`;
}
function stars(n) {
  return `<span class="stars">★ ${new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(n)}</span>`;
}
function setLanguage(lang) {
  if (!LANGUAGES[lang]) return;
  language = lang;
  localStorage.setItem("gj-language", lang);
  render();
}
function updateChrome() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  document.body.classList.toggle("dark", !!state.preferences.dark);
  document.body.classList.toggle(
    "auth-view",
    ["welcome", "onboarding", "login", "register", "forgot"].includes(
      route.page,
    ),
  );
  document.body.classList.toggle("site-view", route.page === "welcome");
  document.body.classList.remove("menu-open");
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = t("metaDescription");
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  if (ogLocale) ogLocale.content = { fr: "fr_MA", en: "en_GB", ar: "ar_MA" }[language];
  $(".brand").innerHTML = brand();
  $(".mobile-brand").innerHTML = brand();
  $(".workspace").innerHTML = spaceSwitch();
  $(".eco").innerHTML =
    icon("leaf") + `<b>${t("ecoTitle")}</b><p>${t("ecoSub")}</p>`;
  $(".support").innerHTML = icon("help") + " " + t("help");
  $(".support").removeAttribute("data-page");
  $(".support").dataset.go = "help";
  $(".user").removeAttribute("data-page");
  $(".user").dataset.go = "profile";
  $(".user").innerHTML =
    avatar(state.profile.name) +
    `<span><b>${esc(state.profile.name)}</b><small>${t(state.profile.role || "personal")}</small></span><span>›</span>`;
  const items = SPACE_NAV[state.space] || SPACE_NAV.sender;
  let active = route.page;
  if (["tracking", "parcel", "checkout", "success", "review"].includes(active)) active = "parcels";
  if (["results", "detail", "favorites", "traveler-reviews"].includes(active)) active = "home";
  if (active === "trip") active = "trips";
  if (active === "request") active = "requests";
  if (["verification", "traveler"].includes(active)) active = "space-traveler";
  if (
    [
      "settings",
      "addresses",
      "payments",
      "favorites",
      "reviews",
      "wallet",
      "security",
    ].includes(active)
  )
    active = "profile";
  $("#nav").innerHTML = items
    .map(
      ([p, i, label]) => {
        const count =
          p === "messages"
            ? Number(state.notifications.some((n) => !n.read && n.key === "newMessage"))
            : p === "requests"
              ? incomingAll().filter((r) => r.status === "awaiting").length
              : 0;
        return `<a href="#${p}" class="nav-link ${active === p ? "active" : ""}" data-nav="${p}"><span class="nav-icon">${icon(i)}</span><span>${t(label)}</span>${count ? `<span class="count">${count}</span>` : ""}</a>`;
      },
    )
    .join("");
  $(".breadcrumb").innerHTML =
    `${t(state.space === "traveler" ? "travelerSpace" : "senderSpace")} <span>/</span> <b id="crumb">${t({ directory: "screenDirectory", traveler: "become", detail: "tripDetails", checkout: "payment", parcel: "parcel", success: "bookingSuccess", support: "contactSupport", review: "evaluate", "space-sender": "dashboard", "space-traveler": "dashboard", trip: "myTrip", request: "requestDetail", home: "findTrip", parcels: "myShipments" }[route.page] || route.page)}</b>`;
  $(".top-actions").innerHTML =
    `${spaceSwitch("compact")}<a href="#welcome" class="demo site-link">${icon("globe")}<span>${t("backToSite")}</span></a><select class="language-select" data-language aria-label="${t("language")}">${Object.entries(
      LANGUAGES,
    )
      .map(
        ([k, v]) =>
          `<option value="${k}" ${language === k ? "selected" : ""}>${v}</option>`,
      )
      .join(
        "",
      )}</select><button data-go="notifications" aria-label="${t("notifications")}" class="icon-button">${icon("bell")}${state.notifications.some((n) => !n.read) ? "<i></i>" : ""}</button><button data-go="profile" class="avatar small" aria-label="${t("profile")}">${esc(state.profile.name[0])}</button>`;
  $("#close-modal").setAttribute("aria-label", t("close"));
  $("footer").innerHTML =
    `<span>© ${new Date().getFullYear()} GOTRAJET · ${t("together")}</span><a href="#welcome">${t("backToSite")}</a><a href="#about">${t("about")}</a><a href="#privacy">${t("privacy")}</a><a href="#directory">${t("screenDirectory")}</a>`;
}
function render() {
  const parts = location.hash.slice(1).split("/");
  route = {
    page: parts[0] || "welcome",
    param: decodeURIComponent(parts.slice(1).join("/")),
  };
  if (!pages[route.page]) route = { page: "home", param: "" };
  const pageSpace = SENDER_PAGES.includes(route.page) ? "sender" : TRAVELER_PAGES.includes(route.page) ? "traveler" : null;
  if (pageSpace && pageSpace !== state.space) {
    state.space = pageSpace;
    persist();
  }
  simulateTravelerResponses();
  updateChrome();
  siteTimers.forEach(clearInterval);
  siteTimers = [];
  const main = $("#main");
  main.innerHTML = pages[route.page]();
  main.classList.remove("page-in");
  void main.offsetWidth;
  main.classList.add("page-in");
  document.title = `${t({ directory: "screenDirectory", detail: "tripDetails", checkout: "payment", traveler: "become", success: "bookingSuccess", support: "contactSupport", tickets: "myRequests", "notification-settings": "notificationPrefs", "traveler-reviews": "travelerReviews", onboarding: "how", review: "evaluate", "space-sender": "senderSpace", "space-traveler": "travelerSpace", trip: "myTrip", request: "requestDetail", parcels: "myShipments" }[route.page] || route.page)} · GOTRAJET`;
  window.scrollTo({ top: 0, behavior: "instant" });
  setupPage();
}
function languagePicker() {
  return `<label class="auth-language">${icon("globe")}<select data-language aria-label="${t("language")}">${Object.entries(
    LANGUAGES,
  )
    .map(
      ([k, v]) =>
        `<option value="${k}" ${k === language ? "selected" : ""}>${v}</option>`,
    )
    .join("")}</select></label>`;
}
/* ------------------------------------------------------------------
   Public website (route #welcome): header, landing sections, footer.
   It reuses the product's search form, route cards, FAQ and reviews so
   the marketing page always reflects the real demo data.
   ------------------------------------------------------------------ */
let landingRole = "send",
  calc = { parcels: 3, price: 60 };
function languageSelect(cls = "") {
  return `<label class="site-language ${cls}">${icon("globe")}<select data-language aria-label="${t("language")}">${Object.entries(
    LANGUAGES,
  )
    .map(
      ([k, v]) =>
        `<option value="${k}" ${k === language ? "selected" : ""}>${v}</option>`,
    )
    .join("")}</select></label>`;
}
function siteHeader() {
  const links = [
    ["how", "navHow"],
    ["routes", "navRoutes"],
    ["coverage", "navMap"],
    ["travel", "navTravel"],
    ["safety", "navSafety"],
    ["faq", "navFaq"],
  ];
  return `<header class="site-header" id="site-header"><div class="site-container site-header-inner"><a href="#welcome" class="site-brand" data-action="scroll-to" data-value="top" aria-label="GOTRAJET">${brand()}</a><nav class="site-nav" id="site-nav" aria-label="GOTRAJET">${links
    .map(
      ([id, k]) =>
        `<button type="button" data-action="scroll-to" data-value="${id}">${t(k)}</button>`,
    )
    .join(
      "",
    )}<div class="menu-extra"><a href="#login" class="btn outline">${t("login")}</a>${languageSelect()}</div></nav><div class="site-actions">${languageSelect()}<a href="#login" class="site-login">${t("login")}</a>${btn(t("createAccount"), "register", "site-cta")}<button type="button" class="site-burger" data-action="site-menu" aria-controls="site-nav" aria-expanded="false" aria-label="${t("menu")}"><span></span><span></span><span></span></button></div></div></header>`;
}
function landingHero() {
  const stats = [
    [CITIES.length, "statCities"],
    [Object.keys(LANGUAGES).length, "statLanguages"],
    [4, "statCode"],
    [0, "statKm"],
  ];
  const words = t("tagline")
    .split(" ")
    .map(
      (w, i) =>
        `<span class="w" style="--i:${i}"><span>${esc(w)}</span></span>`,
    )
    .join(" ");
  return `<section class="site-hero" id="top"><div class="hero-media" aria-hidden="true"><video id="hero-video" muted loop playsinline preload="none" disablepictureinpicture></video></div><div class="site-container hero-top"><div class="welcome-content site-hero-copy"><span class="site-eyebrow hero-in" style="--d:0ms">${t("heroEyebrow")}</span><h1 class="hero-title" aria-label="${esc(t("tagline"))}"><span aria-hidden="true">${words}</span></h1><p class="hero-in" style="--d:650ms">${t("landingSub")}</p></div>${departuresCard()}</div><div class="site-container"><div class="hero-in" style="--d:850ms">${searchForm()}</div><div class="site-hero-links hero-in" style="--d:1000ms"><button type="button" class="btn ghost" data-go="home">${t("guest")}${icon("arrow", "flip")}</button><button type="button" class="btn ghost" data-action="scroll-to" data-value="how">${t("navHow")}</button><button type="button" class="video-toggle" data-action="hero-video" aria-pressed="false" aria-label="${t("pauseVideo")}" title="${t("pauseVideo")}">${icon("pause", "i-pause")}${icon("play", "i-play")}</button><button type="button" class="scroll-cue" data-action="scroll-to" data-value="how" aria-label="${t("navHow")}"><span></span></button></div></div><div class="site-container"><dl class="site-stats">${stats
    .map(
      ([n, k]) =>
        `<div><dt data-count="${n}" data-from="${n === 0 ? 250 : 0}">${new Intl.NumberFormat(locale()).format(n)}</dt><dd>${t(k)}</dd></div>`,
    )
    .join("")}</dl></div></section>${cityMarquee()}`;
}
/* Glass card of the next demo departures, highlighted one after another. */
function departuresCard() {
  const next = [...allTrips()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 4);
  return `<aside class="departures-card hero-in" style="--d:1000ms" aria-label="${t("nextDepartures")}"><div class="departures-head"><b>${icon("route")}${t("nextDepartures")}</b><span class="live-dot">${t("live")}</span></div><div class="departures-track" aria-hidden="true"><i></i></div><ul>${next
    .map(
      (trip, i) =>
        `<li class="${i === 0 ? "active" : ""}"><a href="#detail/${esc(trip.id)}"><span class="dep-time">${esc(trip.time)}</span><span class="dep-route"><b>${esc(trip.from)} <em>→</em> ${esc(trip.to)}</b><small>${esc(trip.name)} · ★ ${trip.rating}</small></span><span class="dep-price">${money(trip.price)}</span></a></li>`,
    )
    .join("")}</ul></aside>`;
}
/* Endless band of Moroccan cities and values. */
function cityMarquee() {
  const items = CITIES.flatMap((c, i) => [
    `<span class="mq-city">${icon("pin")}${esc(c)}</span>`,
    `<span class="mq-word">${t(["faster", "closer", "greener", "simpleSafe"][i % 4])}</span>`,
  ]).join("");
  return `<div class="city-marquee" aria-hidden="true"><div class="mq-track"><div class="mq-group">${items}</div><div class="mq-group">${items}</div></div></div>`;
}
function sectionTitle(eyebrow, title, sub = "", extra = "") {
  return `<div class="site-section-head reveal"><div>${eyebrow ? `<span class="site-eyebrow dark">${eyebrow}</span>` : ""}<h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div>${extra}</div>`;
}
function landingHow() {
  const flows = {
    send: [
      ["box", "sStep1"],
      ["search", "sStep2"],
      ["shield", "sStep3"],
    ],
    travel: [
      ["route", "tStep1"],
      ["chat", "tStep2"],
      ["wallet", "tStep3"],
    ],
  };
  const panelHtml = (role) =>
    `<div class="how-panel" id="how-${role}" role="tabpanel" ${landingRole === role ? "" : "hidden"}><ol class="how-steps">${flows[
      role
    ]
      .map(
        ([i, k], n) =>
          `<li class="how-step reveal tilt" style="--i:${n}"><span class="how-step-num">${String(n + 1).padStart(2, "0")}</span><span class="how-step-icon">${icon(i)}</span><h3>${t(k)}</h3><p>${t(k + "Sub")}</p></li>`,
      )
      .join(
        "",
      )}</ol><div class="how-cta">${role === "send" ? btn(t("send") + icon("arrow", "flip"), "send", "") : btn(t("propose") + icon("arrow", "flip"), "publish", "")}</div></div>`;
  return `<section class="site-section" id="how"><div class="site-container">${sectionTitle(
    "GOTRAJET",
    t("navHow"),
    t("landingHowSub"),
  )}<div class="role-switch" role="tablist">${[
    ["send", "forSenders", "box"],
    ["travel", "forTravelers", "car"],
  ]
    .map(
      ([r, k, i]) =>
        `<button type="button" role="tab" aria-selected="${landingRole === r}" aria-controls="how-${r}" class="${landingRole === r ? "active" : ""}" data-action="landing-role" data-value="${r}">${icon(i)}${t(k)}</button>`,
    )
    .join("")}</div>${panelHtml("send")}${panelHtml("travel")}</div></section>`;
}
function landingRoutes() {
  return `<section class="site-section alt" id="routes"><div class="site-container">${sectionTitle(
    t("together"),
    t("popular"),
    t("popularLandingSub"),
    `<button class="btn outline" data-action="all-routes">${t("seeAll")}${icon("arrow", "flip")}</button>`,
  )}<div class="route-grid reveal">${allTrips().slice(0, 3).map(tripCard).join("")}</div></div></section>`;
}
let coverageCity = "Casablanca";
function landingCoverage() {
  return `<section class="site-section" id="coverage"><div class="site-container coverage-split"><div class="coverage-copy reveal"><span class="site-eyebrow dark">${t("googleMaps")}</span><h2>${t("coverageTitle")}</h2><p>${t("coverageSub")}</p><div class="city-chips" role="group" aria-label="${t("coverageTitle")}">${CITIES.map(
    (c) =>
      `<button type="button" class="${c === coverageCity ? "active" : ""}" aria-pressed="${c === coverageCity}" data-action="coverage-city" data-value="${esc(c)}">${icon("pin")}${esc(c)}</button>`,
  ).join(
    "",
  )}</div>${btn(t("search") + icon("arrow", "flip"), "results", "")}</div><div class="coverage-map reveal" id="coverage-map">${googleMap({ q: mapPlace(coverageCity), zoom: 11 }, "large")}</div></div></section>`;
}
function landingWhy() {
  const items = [
    ["wallet", "wPrice", "wPriceSub"],
    ["clock", "wFast", "wFastSub"],
    ["leaf", "greener", "wGreenSub"],
    ["pin", "wTrack", "wTrackSub"],
    ["star", "wTrust", "wTrustSub"],
    ["globe", "wLang", "wLangSub"],
  ];
  return `<section class="site-section" id="why"><div class="site-container">${sectionTitle(
    "GOTRAJET",
    t("whyTitle"),
    t("whySub"),
  )}<div class="why-grid">${items
    .map(
      ([i, k, s], n) =>
        `<article class="why-card reveal tilt" style="--i:${n % 3}"><span class="why-icon">${icon(i)}</span><h3>${t(k)}</h3><p>${t(s)}</p></article>`,
    )
    .join("")}</div></div></section>`;
}
function landingSafety() {
  return `<section class="site-section alt" id="safety"><div class="site-container safety-split"><div class="safety-visual reveal"><img src="${photos[2]}" alt="" loading="lazy"><div class="code-card"><span>${icon("shield")}${t("handoffCode")}</span><div class="code-digits" aria-hidden="true"><b style="--i:0">2</b><b style="--i:1">0</b><b style="--i:2">4</b><b style="--i:3">8</b></div><small class="code-status"><span class="code-wait">${t("parcel")} #GJ2048 · ${t("onRoad")}</span><span class="code-ok">${icon("check")}${t("handoffConfirmed")}</span></small></div></div><div class="safety-copy reveal"><span class="site-eyebrow dark">${t("trustSafety")}</span><h2>${t("safetyTitle")}</h2><p>${t("safetyLandingSub")}</p><ul class="check-list">${[
    "sc1",
    "sc2",
    "sc3",
    "sc4",
    "sc5",
  ]
    .map((k) => `<li>${icon("check")}${t(k)}</li>`)
    .join(
      "",
    )}</ul>${btn(t("help") + icon("arrow", "flip"), "help", "outline")}</div></div></section>`;
}
function calcTotal() {
  return calc.parcels * calc.price * 0.93;
}
function landingTravel() {
  return `<section class="site-travel" id="travel"><div class="site-container travel-split"><div class="travel-copy reveal"><span class="site-eyebrow">${t("forTravelers")}</span><h2>${t("promoTitle")}</h2><p>${t("onboard2Sub")}</p><ul class="travel-points">${[
    "tStep1",
    "tStep2",
    "tStep3",
  ]
    .map((k) => `<li>${icon("check")}${t(k)}</li>`)
    .join(
      "",
    )}</ul>${btn(t("become") + icon("arrow", "flip"), "traveler", "")}</div><form class="calc-card reveal" id="calc-form" onsubmit="return false"><h3>${t("calcTitle")}</h3><p>${t("calcSub")}</p><label class="calc-row"><span>${t("calcParcels")}<output id="calc-parcels-out">${calc.parcels}</output></span><input type="range" min="1" max="10" step="1" value="${calc.parcels}" data-calc="parcels" aria-label="${t("calcParcels")}"></label><label class="calc-row"><span>${t("calcPrice")}<output id="calc-price-out">${money(calc.price)}</output></span><input type="range" min="20" max="300" step="5" value="${calc.price}" data-calc="price" aria-label="${t("calcPrice")}"></label><div class="calc-result"><span>${t("estimatedEarnings")}</span><strong id="calc-total" aria-live="polite">${money(calcTotal())}</strong><small>${t("earningsNote")}</small></div></form></div></section>`;
}
function landingReviews() {
  return `<section class="site-section" id="reviews"><div class="site-container">${sectionTitle(
    t("community"),
    t("testimonialsTitle"),
    "",
    `<span class="badge">${t("demoReviews")}</span>`,
  )}<div class="review-grid">${sampleReviews
    .map(
      (r, n) =>
        `<figure class="review-card reveal tilt" style="--i:${n}"><div class="review-stars" aria-label="${r.rating} / 5">${"★".repeat(r.rating)}<span>${"★".repeat(5 - r.rating)}</span></div><blockquote>“${esc(r[language])}”</blockquote><figcaption>${avatar(r.name)}<span><b>${esc(r.name)}</b><small>${esc(r.route || "")}</small></span></figcaption></figure>`,
    )
    .join("")}</div></div></section>`;
}
function landingFaq() {
  return `<section class="site-section alt" id="faq"><div class="site-container faq-split"><div class="reveal"><span class="site-eyebrow dark">${t("help")}</span><h2>${t("faq")}</h2><p>${t("safetySub")}</p>${btn(icon("chat") + t("contactSupport"), "support", "outline")}</div><div class="faq-list reveal">${faqContent()}</div></div></section>`;
}
function landingCta() {
  return `<section class="site-cta-band"><div class="site-container reveal"><div><h2>${t("ctaTitle")}</h2><p>${t("ctaSub")}</p></div><div class="site-cta-actions">${btn(t("createAccount") + icon("arrow", "flip"), "register", "")}${btn(t("guest"), "home", "outline light-outline")}</div></div></section>`;
}
function siteFooter() {
  const col = (title, links) =>
    `<div class="site-foot-col"><h3>${title}</h3><ul>${links
      .map(
        ([label, target, action]) =>
          `<li>${action ? `<button type="button" data-action="${action}">${label}</button>` : `<a href="#${target}">${label}</a>`}</li>`,
      )
      .join("")}</ul></div>`;
  return `<footer class="site-footer"><div class="site-container"><div class="site-foot-grid"><div class="site-foot-brand"><a href="#welcome" class="site-brand" data-action="scroll-to" data-value="top">${brand()}</a><p>${t("footerAbout")}</p>${languageSelect("on-dark")}</div>${col(
    t("footService"),
    [
      [t("send"), "send"],
      [t("propose"), "publish"],
      [t("track"), "tracking/GJ2048"],
      [t("popular"), "", "all-routes"],
    ],
  )}${col("GOTRAJET", [
    [t("about"), "about"],
    [t("ourImpact"), "impact"],
    [t("become"), "traveler"],
    [t("screenDirectory"), "directory"],
  ])}${col(t("footSupport"), [
    [t("help"), "help"],
    [t("contactSupport"), "support"],
    [t("terms"), "terms"],
    [t("privacy"), "privacy"],
  ])}</div><div class="site-foot-bottom"><span>© ${new Date().getFullYear()} GOTRAJET · ${t("madeIn")}</span><span class="site-foot-demo">${icon("shield")}${t("footDemo")}</span><button type="button" class="site-top-link" data-action="scroll-to" data-value="top">${t("backToTop")} ↑</button></div></div></footer>`;
}
function welcome() {
  return `<div class="site"><div class="scroll-progress" aria-hidden="true"></div>${siteHeader()}<div class="site-main">${landingHero()}${landingHow()}${landingRoutes()}${landingCoverage()}${landingWhy()}${landingTravel()}${landingSafety()}${landingReviews()}${landingFaq()}${landingCta()}</div>${siteFooter()}</div>`;
}
function onboarding() {
  const k = onboardingIndex + 1;
  return `<div class="onboarding auth-card">${languagePicker()}<div class="onboarding-art">${icon(["box", "car", "pin"][onboardingIndex])}</div><span class="eyebrow">GOTRAJET · 0${k}</span><h1>${t("onboard" + k)}</h1><p>${t("onboard" + k + "Sub")}</p><div class="dots">${[0, 1, 2].map((i) => `<button class="${i === onboardingIndex ? "active" : ""}" data-action="onboard-dot" data-value="${i}" aria-label="${t("next")} ${i + 1}"></button>`).join("")}</div><button class="btn wide" data-action="onboard-next">${t(k === 3 ? "start" : "next")}${icon("arrow")}</button>${btn(t("guest"), "home", "ghost")}</div>`;
}
function authPage(kind) {
  const registering = kind === "register";
  return `<section class="auth-layout"><div class="auth-visual"><a class="auth-brand" href="#welcome">${brand()}</a><h1>${t("tagline")}</h1><p>${t("heroSub")}</p></div><div class="auth-card">${languagePicker()}<a href="#welcome" class="auth-back">← ${t("back")}</a><h1>${t(registering ? "createAccount" : "login")}</h1><p>${t(registering ? "registerSub" : "loginSub")}</p><form id="auth-form" data-kind="${kind}">${registering ? `<div class="role-choices"><label><input type="radio" name="role" value="individual" checked>${t("individual")}</label><label><input type="radio" name="role" value="carrier">${t("carrier")}</label></div>${field(t("name"), "name", "", "text", 'required maxlength="80" autocomplete="name"')}` : ""}${field(t("email"), "email", "", "email", 'required autocomplete="email"')}${registering ? field(t("phone"), "phone", "", "tel", 'required maxlength="30" autocomplete="tel"') : ""}<label class="form-label">${t("password")}<span class="password-field"><input name="password" type="password" minlength="8" required autocomplete="${registering ? "new-password" : "current-password"}"><button type="button" data-action="toggle-password" aria-label="${t("showPassword")}">${icon("eye")}</button></span></label>${registering ? `<label class="check-label"><input type="checkbox" name="terms" required>${t("acceptTerms")} <a href="#terms">↗</a></label>` : `<a href="#forgot" class="text-link forgot-link">${t("forgot")}</a>`}<div class="notice auth-note">${t("authNote")}</div><button class="btn wide">${t(registering ? "register" : "login")}</button></form><div class="divider">${t("or")}</div><div class="social-buttons">${["Google", "Apple", "Facebook"].map((p) => `<button data-action="social" data-value="${p}">${p === "Google" ? '<b class="google-g">G</b>' : p === "Apple" ? "●" : "ⓕ"} ${p}</button>`).join("")}</div><p class="auth-switch">${t(registering ? "already" : "noAccount")} <a href="#${registering ? "login" : "register"}">${t(registering ? "login" : "register")}</a></p>${btn(t("guest"), "home", "ghost")}</div></section>`;
}
function forgot() {
  return `<section class="auth-card standalone">${languagePicker()}<a href="#login">← ${t("back")}</a><h1>${t("resetPassword")}</h1><p>${t("resetSub")}</p><form id="forgot-form">${field(t("email"), "email", "", "email", "required")}<button class="btn wide">${t("continue")}</button></form><p class="auth-note">${t("authNote")}</p></section>`;
}
function searchForm(compact = false) {
  return `<form id="search-form" class="search-card ${compact ? "compact-search" : ""}"><div class="tabs"><button type="button" class="tab ${search.mode === "send" ? "active" : ""}" data-action="search-mode" data-value="send">${icon("box")}${t("send")}</button><button type="button" class="tab ${search.mode === "travel" ? "active" : ""}" data-action="search-mode" data-value="travel">${icon("car")}${t("travel")}</button></div><div class="search-grid enhanced-search"><div class="field">${icon("pin")}<label>${t("from")}<select name="from" aria-label="${t("from")}">${options(CITIES, search.from)}</select></label></div><button type="button" class="swap" data-action="swap" aria-label="${t("swap")}">⇄</button><div class="field destination">${icon("pin")}<label>${t("to")}<select name="to" aria-label="${t("to")}">${options(CITIES, search.to)}</select></label></div><div class="field">${icon("box")}<label>${t("type")}<select name="size" aria-label="${t("type")}">${["documents", "small", "medium", "large"].map((k) => `<option value="${k}" ${k === search.size ? "selected" : ""}>${t(k)}</option>`).join("")}</select></label></div><div class="field">${icon("calendar")}<label>${t("departureDate")}<input type="date" name="date" min="${today()}" value="${esc(search.date)}" aria-label="${t("departureDate")}"></label></div><button class="btn">${icon("search")}${t(search.mode === "travel" ? "propose" : "search")}</button></div></form>`;
}
function tripCard(trip) {
  return `<article class="route-card"><a href="#detail/${esc(trip.id)}" class="route-photo"><img src="${photos[trip.photo || 0]}" alt="${esc(trip.to)}" loading="lazy"><span class="photo-badge">● ${t("available")}</span></a><button class="favorite-button ${state.favorites.includes(trip.id) ? "saved" : ""}" data-action="favorite" data-value="${esc(trip.id)}" aria-label="${t(state.favorites.includes(trip.id) ? "favoriteRemove" : "favoriteAdd")}">${icon("heart")}</button><div class="route-info"><a href="#detail/${esc(trip.id)}" class="route-title">${esc(trip.from)}<span>→</span>${esc(trip.to)}</a><div class="route-meta"><span>${icon("calendar")}${dateText(trip.date)}</span><span>${freeSeats(trip)} ${t("seats")}</span></div><div class="route-bottom"><div class="driver">${avatar(trip.name)}<div>${esc(trip.name)}<div>${stars(trip.rating)} <small>(${trip.reviews})</small></div></div></div><div class="price">${money(trip.price)}</div></div></div></article>`;
}
function shipmentCard(p) {
  return `<article class="shipment"><div class="shipment-header"><span class="box-icon">${icon("box")}</span><div><h3>${t("parcel")} #${esc(p.id)}</h3><small>${esc(p.from)} → ${esc(p.to)}</small></div>${badge(p.status)}</div><div class="progress"><span style="width:${p.status === "delivered" ? 100 : p.status === "transit" ? 68 : p.status === "cancelled" ? 0 : 15}%"></span></div><div class="shipment-foot"><span>${dateText(p.date)}${p.time ? " · " + esc(p.time) : ""}</span><a class="text-link" href="#parcel/${esc(p.id)}">${t("details")} →</a></div></article>`;
}
function currentShipment() {
  const p = allParcels().find((p) =>
    ["transit", "reserved"].includes(p.status),
  );
  return p ? shipmentCard(p) : empty(btn(t("send"), "send"));
}
function howSection() {
  return `<section class="how-section"><div class="section-heading"><div><h2>${t("how")}</h2><p>${t("howSub")}</p></div><a href="#about" class="text-link">${t("about")} →</a></div><div class="how-grid">${[
    ["request", "box"],
    ["findTraveler", "user"],
    ["confirm", "check"],
    ["track", "pin"],
  ]
    .map(
      ([k, i], n) =>
        `<div><span class="how-number">${n + 1}</span><div class="how-icon">${icon(i)}</div><b>${t(k)}</b></div>`,
    )
    .join("")}</div></section>`;
}
function home() {
  return (
    head(
      "hello",
      t("homeSub"),
      `<span class="date-label">${dateText(today())}</span>`,
    ).replace(
      `<h1>${t("hello")}</h1>`,
      `<h1>${t("hello")} ${esc(state.profile.name.split(" ")[0])} ${icon("sun")}</h1>`,
    ) +
    `<section class="hero"><div class="eyebrow">GOTRAJET · MAROC</div><h2>${t("heroTitle")}</h2><p>${t("heroSub")}</p><span class="hero-tag">${icon("route")} ${t("together")}</span></section>` +
    searchForm() +
    `<section class="quick-actions">${[
      ["send", "box"],
      ["tracking", "pin"],
      ["traveler", "car"],
      ["wallet", "wallet"],
    ]
      .map(
        ([p, i]) =>
          `<button class="quick" data-go="${p}"><span class="tile-icon">${icon(i)}</span><div><b>${t(p === "tracking" ? "track" : p === "traveler" ? "propose" : p)}</b></div><span>›</span></button>`,
      )
      .join(
        "",
      )}</section><section><div class="section-heading"><div><h2>${t("popular")}</h2><p>${t("together")}</p></div><button class="text-link" data-action="all-routes">${t("seeAll")} →</button></div><div class="route-grid">${allTrips().slice(0, 3).map(tripCard).join("")}</div></section><div class="lower-grid"><section><div class="section-heading"><h2>${t("ongoingShipments")}</h2><a class="text-link" href="#parcels">${t("parcels")} →</a></div>${currentShipment()}</section><section class="traveler-promo"><div class="eyebrow">GOTRAJET · ${t("community")}</div><h2>${t("promoTitle")}</h2><p>${t("promoSub")}</p>${btn(t("become") + icon("arrow"), "traveler")}</section></div>${howSection()}<section class="category-section"><div class="section-heading"><div><h2>${t("categories")}</h2><p>${t("categorySub")}</p></div></div><div class="category-grid">${[
      ["small", "box"],
      ["autoParts", "car"],
      ["food", "leaf"],
      ["documents", "card"],
    ]
      .map(
        ([k, i]) =>
          `<button class="category" data-action="category-start" data-value="${k}"><span>${icon(i)}</span>${t(k)}</button>`,
      )
      .join(
        "",
      )}</div></section><section class="safety-banner">${icon("shield")}<div><h2>${t("safetyTitle")}</h2><p>${t("safetySub")}</p></div>${btn(icon("arrow"), "about", "ghost")}</section><div class="trust-strip">${[
      ["shield", "simpleSafe"],
      ["wallet", "ecoValue"],
      ["leaf", "greener"],
      ["user", "community"],
    ]
      .map(([i, k]) => `<div class="trust-item">${icon(i)}<b>${t(k)}</b></div>`)
      .join("")}</div>`
  );
}
function filteredTrips() {
  const sizeWeight = { documents: 1, small: 5, medium: 10, large: 20 };
  return allTrips()
    .filter(
      (p) =>
        (filters.all || (p.from === search.from && p.to === search.to)) &&
        (!search.date || p.date === search.date) &&
        p.weight >= sizeWeight[search.size] &&
        (!filters.maxPrice || p.price <= Number(filters.maxPrice)) &&
        p.rating >= Number(filters.minRating) &&
        freeSeats(p) >= Number(filters.minSeats),
    )
    .sort((a, b) =>
      filters.sort === "price"
        ? a.price - b.price
        : filters.sort === "rating"
          ? b.rating - a.rating
          : filters.sort === "seats"
            ? freeSeats(b) - freeSeats(a)
            : a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    );
}
function schematic(from = "Casablanca", to = "Rabat", progress = 68) {
  const points = [
    [90, 220],
    [210, 180],
    [310, 190],
    [410, 130],
    [510, 150],
    [620, 70],
    [800, 50],
  ];
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let distance = (lengths.reduce((a, b) => a + b, 0) * progress) / 100,
    marker = points[0];
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i]) {
      const f = distance / lengths[i];
      marker = [
        points[i][0] + (points[i + 1][0] - points[i][0]) * f,
        points[i][1] + (points[i + 1][1] - points[i][1]) * f,
      ];
      break;
    }
    distance -= lengths[i];
    marker = points[i + 1];
  }
  return `<div class="map interactive-map" tabindex="0" aria-label="${t("map")}"><svg class="map-svg" viewBox="0 0 900 280" preserveAspectRatio="none" role="img" aria-label="${t("map")}"><g class="map-layer"><path d="M90 220 210 180 310 190 410 130 510 150 620 70 800 50" fill="none" stroke="#bdd1df" stroke-width="10" stroke-linecap="round"/><path d="M90 220 210 180 310 190 410 130 510 150 620 70 800 50" pathLength="100" stroke-dasharray="${progress} 100" fill="none" stroke="#1762a1" stroke-width="7" stroke-linecap="round"/><circle cx="90" cy="220" r="11" fill="#19876c" stroke="white" stroke-width="4"/><circle cx="800" cy="50" r="11" fill="#ff8616" stroke="white" stroke-width="4"/><circle cx="${marker[0]}" cy="${marker[1]}" r="11" fill="#1762a1" stroke="white" stroke-width="4"/></g></svg><span class="map-label start">${esc(from)}</span><span class="map-label end">${esc(to)}</span><span class="map-label moving">${progress}% · ${t(progress === 100 ? "delivered" : progress < 30 ? "reserved" : "onRoad")}</span><div class="map-controls"><button type="button" data-action="map-in" aria-label="${t("zoomIn")}">+</button><button type="button" data-action="map-out" aria-label="${t("zoomOut")}">−</button><button type="button" data-action="map-reset" aria-label="${t("resetMap")}">⟲</button></div></div><p class="map-note">${t("mapNote")} ${t("mapPan")}</p>`;
}

/* ------------------------------------------------------------------
   Google Maps.
   Without a key, the public keyless embed (maps?…&output=embed) is used.
   For production, create a key restricted to your domain with the
   "Maps Embed API" enabled and paste it here: the official Embed API
   (maps/embed/v1) is then used automatically.
   ------------------------------------------------------------------ */
const GOOGLE_MAPS_API_KEY = "";
const mapPlace = (place) => `${place}, Morocco`;
function googleMapUrl({ from, to, q, zoom }) {
  const hl = language;
  if (GOOGLE_MAPS_API_KEY) {
    const key = encodeURIComponent(GOOGLE_MAPS_API_KEY);
    return from && to
      ? `https://www.google.com/maps/embed/v1/directions?key=${key}&origin=${encodeURIComponent(mapPlace(from))}&destination=${encodeURIComponent(mapPlace(to))}&mode=driving&language=${hl}`
      : `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(q)}&language=${hl}${zoom ? "&zoom=" + zoom : ""}`;
  }
  return from && to
    ? `https://www.google.com/maps?saddr=${encodeURIComponent(mapPlace(from))}&daddr=${encodeURIComponent(mapPlace(to))}&hl=${hl}&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(q)}&hl=${hl}${zoom ? "&z=" + zoom : ""}&output=embed`;
}
function googleMapLink({ from, to, q }) {
  return from && to
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(mapPlace(from))}&destination=${encodeURIComponent(mapPlace(to))}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
function googleMap(target, cls = "") {
  const title =
    target.from && target.to
      ? `${t("googleMaps")} · ${target.from} → ${target.to}`
      : `${t("googleMaps")} · ${target.q}`;
  return `<div class="gmap ${cls}"><iframe src="${esc(googleMapUrl(target))}" title="${esc(title)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe><a class="gmap-open" href="${esc(googleMapLink(target))}" target="_blank" rel="noopener noreferrer">${icon("pin")}${t("openInMaps")}</a></div>`;
}
/* Route card with two views: the real Google route, and the interactive
   schematic that shows the simulated parcel progress. */
let mapView = "google";
function routeMap(from, to, progress = 68) {
  return `<div class="route-map" data-view="${mapView}"><div class="map-switch" role="tablist">${[
    ["google", "googleMaps", "globe"],
    ["schematic", "schematicView", "route"],
  ]
    .map(
      ([v, k, i]) =>
        `<button type="button" role="tab" aria-selected="${mapView === v}" class="${mapView === v ? "active" : ""}" data-action="map-view" data-value="${v}">${icon(i)}${t(k)}</button>`,
    )
    .join(
      "",
    )}</div><div class="map-pane" data-pane="google" ${mapView === "google" ? "" : "hidden"}>${googleMap({ from, to })}<p class="map-note">${t("mapsNote")}</p></div><div class="map-pane" data-pane="schematic" ${mapView === "schematic" ? "" : "hidden"}>${schematic(from, to, progress)}</div></div>`;
}

function resultRow(p) {
  return `<article class="result-row">${avatar(p.name)}<div class="details"><h3>${esc(p.name)} ${stars(p.rating)} <small>(${p.reviews})</small></h3><p>${esc(p.from)} → ${esc(p.to)}</p><p>${dateText(p.date)} · ${esc(p.time)} · ${freeSeats(p)} ${t("seats")}</p><span class="badge">${esc(p.vehicle)} · ${t("upTo")} ${p.weight} kg</span></div><button class="favorite-inline ${state.favorites.includes(p.id) ? "saved" : ""}" data-action="favorite" data-value="${esc(p.id)}" aria-label="${t("favorites")}">${icon("heart")}</button><div class="result-price"><div class="price">${money(p.price)}</div>${btn(t("viewTrip") + icon("arrow"), "detail/" + p.id)}</div></article>`;
}
function results() {
  const list = filteredTrips();
  return (
    head("results", t("resultsSub")) +
    searchForm(true) +
    `<div class="results-bar"><span>${list.length} · ${filters.all ? t("allRoutes") : esc(search.from) + " → " + esc(search.to)}</span><div class="filter-actions"><label class="sr-only" for="sort">${t("sort")}</label><select id="sort"><option value="time" ${filters.sort === "time" ? "selected" : ""}>${t("time")}</option><option value="price" ${filters.sort === "price" ? "selected" : ""}>${t("price")}</option><option value="rating" ${filters.sort === "rating" ? "selected" : ""}>${t("rating")}</option><option value="seats" ${filters.sort === "seats" ? "selected" : ""}>${t("capacity")}</option></select><button class="btn outline" data-action="filters">${icon("filter")}${t("filters")}</button></div></div><div class="search-results-layout"><div class="result-list">${list.length ? list.map(resultRow).join("") : empty(`<p>${t("noTrips")}</p><button class="btn outline" data-action="clear-filters">${t("clearFilters")}</button>`)}</div><aside class="results-map">${routeMap(list[0]?.from || search.from, list[0]?.to || search.to)}${localNote()}</aside></div>`
  );
}
function detail() {
  const p = getTrip(route.param);
  if (!p) return head("tripDetails") + empty(btn(t("search"), "results"));
  return (
    head(
      "tripDetails",
      `${esc(p.from)} → ${esc(p.to)}`,
      `<button class="btn outline" data-action="favorite" data-value="${esc(p.id)}">${icon("heart")}${t(state.favorites.includes(p.id) ? "favoriteRemove" : "favoriteAdd")}</button>`,
    ) +
    `<div class="trip-cover"><img src="${photos[p.photo || 0]}" alt="${esc(p.to)}"><span>${t("together")}</span></div><div class="detail-layout"><section class="panel"><div class="section-heading"><h2>${esc(p.from)} → ${esc(p.to)}</h2><strong class="price">${money(p.price)}</strong></div><p>${dateText(p.date)} · ${p.time}</p><div class="traveler-row">${avatar(p.name)}<div><h3>${esc(p.name)}</h3>${stars(p.rating)} · ${p.reviews} ${t("rating")}</div><button class="text-link" data-action="contact-traveler" data-value="${esc(p.name)}">${icon("chat")}${t("contact")}</button></div><h2>${t("aboutTrip")}</h2>${[
      ["pickup", p.from + " · Centre"],
      ["dropoff", p.to + " · Centre"],
      ["duration", p.duration],
      ["vehicle", p.vehicle],
      ["capacity", freeSeats(p) + " · " + t("upTo") + " " + p.weight + " kg"],
    ]
      .map(
        ([k, v]) =>
          `<div class="payment-row"><span>${t(k)}</span><b>${esc(v)}</b></div>`,
      )
      .join(
        "",
      )}<div class="detail-actions">${btn(t("reserve"), "checkout/" + p.id, "", freeSeats(p) < 1 ? "disabled" : "")}${btn(t("travelerReviews"), "traveler-reviews/" + p.id, "outline")}</div></section><aside class="panel">${routeMap(p.from, p.to)}<h3>${t("safetyTitle")}</h3><p>${t("safetySub")}</p>${localNote()}</aside></div>`
  );
}
function checkout() {
  const p = getTrip(route.param);
  if (!p) return empty(btn(t("search"), "results"));
  const qty = Math.max(1, Math.min(reservation.quantity, freeSeats(p))),
    transport = (Number(p.price) - 10) * qty,
    fee = 10 * qty,
    insurance = reservation.insurance ? 10 * qty : 0,
    total = transport + fee + insurance;
  reservation.quantity = qty;
  return (
    head("payment", t("resultsSub")) +
    `<form id="checkout-form" data-trip="${esc(p.id)}" class="detail-layout"><section class="panel"><h2>${t("orderSummary")}</h2><div class="order-summary"><h3>${esc(p.from)} → ${esc(p.to)}</h3><p>${dateText(p.date)} · ${p.time} · ${esc(p.name)}</p></div><div class="form-grid">${field(t("quantity"), "quantity", qty, "number", `required min="1" max="${freeSeats(p)}"`)}${field(t("weight"), "weight", draft.tripId === p.id ? draft.weight : 3, "number", `required min="0.1" step="0.1" max="${p.weight}"`)}</div><label class="check-label"><input type="checkbox" name="insurance" ${reservation.insurance ? "checked" : ""}>${t("insurance")} · ${money(10)} / ${t("parcel")}</label><div class="payment-row"><span>${t("transport")}</span><b>${money(transport)}</b></div><div class="payment-row"><span>${t("serviceFee")}</span><b>${money(fee)}</b></div>${insurance ? `<div class="payment-row"><span>${t("insurance")}</span><b>${money(insurance)}</b></div>` : ""}<div class="total-row"><b>${t("total")}</b><strong>${money(total)}</strong></div></section><section class="panel"><h2>${t("choosePayment")}</h2>${["card", "mobileWallet", "cash", "wallet"].map((k) => `<label class="payment-option"><input type="radio" name="payment" value="${k}" ${reservation.payment === k ? "checked" : ""}>${icon(k === "card" ? "card" : "wallet")}<span>${t(k)}${k === "wallet" ? `<small>${money(state.balance)}</small>` : ""}</span></label>`).join("")}${localNote()}<button class="btn wide" ${freeSeats(p) < 1 ? "disabled" : ""}>${t("payDemo")} · ${money(total)}</button></section></form>`
  );
}
function success() {
  const p =
    getParcel(route.param) || state.requests.find((p) => p.id === route.param);
  return `<section class="success-card panel"><div class="success-icon">${icon("check")}</div><h1>${t(p?.status === "pending" ? "requestSaved" : p?.status === "awaiting" ? "requestSent" : "bookingSuccess")}</h1><p>${t(p?.status === "awaiting" ? "requestSentSub" : "bookingSuccessSub")}</p>${p?.status === "awaiting" ? stepper(SENDER_STEPS, 0) : ""}${p ? `<div class="order-summary"><b>#${esc(p.id)}</b><p>${esc(p.from)} → ${esc(p.to)}</p><strong>${p.price ? money(p.price) : dateText(p.date)}</strong></div>` : ""}${localNote()}<div class="detail-actions">${p && p.status !== "pending" ? btn(t("allDetails"), "parcel/" + p.id) : btn(t("viewBooking"), "parcels")}${btn(t("dashboard"), "space-sender", "outline")}</div></section>`;
}
function captureDraft(form) {
  if (form) {
    Object.assign(draft, Object.fromEntries(new FormData(form)));
    write("gj-draft", draft);
  }
}
function send() {
  const labels = ["parcelStep1", "parcelStep2", "parcelStep3", "parcelStep4"];
  let body = "";
  if (draft.step === 1) {
    body = `<h2>${t("parcelStep1")}</h2><div class="category-grid">${["documents", "small", "medium", "large"].map((k) => `<button type="button" class="category ${draft.type === k ? "active" : ""}" data-action="parcel-type" data-value="${k}"><span>${icon(k === "documents" ? "card" : "box")}</span>${t(k)}</button>`).join("")}</div><div class="form-grid dimensions-grid">${["length", "width", "height", "weight"].map((k) => field(t(k), k, draft[k], "number", `required min="0.1" step="0.1" max="${k === "weight" ? 20 : 200}"`)).join("")}</div><label class="form-label">${t("content")}<textarea name="content" maxlength="500" required>${esc(draft.content)}</textarea></label><label class="form-label">${t("notes")}<textarea name="notes" maxlength="500">${esc(draft.notes)}</textarea></label>`;
  } else if (draft.step === 2) {
    body = `<h2>${t("parcelStep2")}</h2><div class="form-grid">${cityField(t("from"), "from", draft.from)}${cityField(t("to"), "to", draft.to)}${field(t("pickup"), "pickup", draft.pickup, "text", 'required maxlength="250"')}${field(t("dropoff"), "dropoff", draft.dropoff, "text", 'required maxlength="250"')}${field(t("recipient"), "recipient", draft.recipient, "text", 'required maxlength="80"')}${field(t("phone"), "phone", draft.phone, "tel", 'required maxlength="30"')}</div>${state.addresses.length ? `<button type="button" class="btn outline" data-action="pick-address">${t("chooseAddress")}</button>` : ""}`;
  } else if (draft.step === 3) {
    const matches = allTrips().filter(
      (p) =>
        p.from === draft.from &&
        p.to === draft.to &&
        p.date === draft.date &&
        p.weight >= Number(draft.weight) &&
        freeSeats(p) > 0,
    );
    body = `<h2>${t("parcelStep3")}</h2><div class="form-grid">${field(t("deliveryDate"), "date", draft.date, "date", `required min="${today()}"`)}</div><div class="parcel-trip-options">${matches.length ? matches.map((p) => `<label class="trip-choice"><input type="radio" name="tripId" value="${esc(p.id)}" ${draft.tripId === p.id ? "checked" : ""}><div><b>${esc(p.name)} · ${p.time}</b><p>${esc(p.from)} → ${esc(p.to)}</p>${stars(p.rating)}</div><strong>${money(p.price)}</strong></label>`).join("") : `<p>${t("noTrips")}</p>`}</div><label class="check-label"><input type="radio" name="tripId" value="" ${!draft.tripId ? "checked" : ""}>${t("saveRequest")} · ${t("pending")}</label>`;
  } else {
    body = `<h2>${t("parcelStep4")}</h2>${[
      ["from", draft.from],
      ["to", draft.to],
      ["type", t(draft.type) + " · " + draft.weight + " kg"],
      ["content", draft.content],
      ["recipient", draft.recipient],
      ["phone", draft.phone],
      ["deliveryDate", dateText(draft.date)],
      ["pickup", draft.pickup],
      ["dropoff", draft.dropoff],
    ]
      .map(
        ([k, v]) =>
          `<div class="payment-row"><span>${t(k)}</span><b>${esc(v)}</b></div>`,
      )
      .join(
        "",
      )}<div class="notice">${draft.tripId ? t("reservation") + " · " + money(getTrip(draft.tripId)?.price || 0) : t("pending")}</div>${localNote()}`;
  }
  return (
    head("send", t("howSub")) +
    `<div class="steps">${labels.map((k, i) => `<div class="step ${draft.step >= i + 1 ? "active" : ""}"><b>${i + 1}</b>${t(k)}</div>`).join("")}</div><form class="panel parcel-form" id="parcel-form">${body}<div class="detail-actions"><button type="button" class="btn outline" data-action="parcel-back">← ${t(draft.step === 1 ? "cancel" : "back")}</button><button class="btn">${t(draft.step === 4 ? (draft.tripId ? "reservation" : "saveRequest") : "continue")}${icon("arrow")}</button></div></form>`
  );
}
function tracking() {
  const p = getParcel(route.param || "GJ2048");
  if (!p) return empty();
  const done = p.status === "delivered";
  return (
    head("tracking", `${t("parcel")} #${esc(p.id)}`, badge(p.status)) +
    routeMap(p.from, p.to, done ? 100 : p.status === "transit" ? 68 : 15) +
    `<div class="detail-layout"><section class="panel"><div class="section-heading"><h2>${t("parcel")} #${esc(p.id)}</h2>${badge(p.status)}</div><p>${t("estimated")} : ${dateText(p.date)} · ${p.time || "14:30"}</p><div class="timeline">${["taken", "confirmedDeparture", "onRoad", "handoff"].map((k, i) => `<div class="timeline-item ${!done && (p.status === "reserved" || i === 3) ? "pending" : ""}"><h3>${t(k)}</h3><p>${i === 0 ? "09:05 · " + esc(p.from) : i === 1 ? "10:15 · " + esc(p.from) + " → " + esc(p.to) : i === 3 ? t(done ? "delivered" : "codeRequired") : t("mapNote")}</p></div>`).join("")}</div>${!done && p.status !== "cancelled" ? `<button class="btn" data-action="handoff" data-value="${esc(p.id)}">${t("confirmDelivery")}</button>` : done ? btn(t("evaluate"), "review/" + p.id) : ""}</section><aside class="panel"><h2>${t("traveler")}</h2><div class="traveler-row">${avatar(p.name)}<div><b>${esc(p.name)}</b><p>${stars(4.9)}</p></div></div><button class="btn blue wide" data-action="contact-traveler" data-value="${esc(p.name)}">${icon("chat")}${t("contact")}</button><p>${t("safetySub")}</p>${localNote()}</aside></div>`
  );
}
function publish() {
  return (
    head("propose", t("publishSub")) +
    `<form class="panel" id="publish-form"><div class="notice">${t("promoSub")}</div><div class="form-grid">${cityField(t("from"), "from", search.mode === "travel" ? search.from : "Rabat")}${cityField(t("to"), "to", search.mode === "travel" ? search.to : "Casablanca")}${field(t("departureDate"), "date", search.date || futureDate(1), "date", `min="${today()}" required`)}${field(t("time"), "time", "09:30", "time", "required")}${field(t("parcelCount"), "seats", 3, "number", 'min="1" max="20" required')}${field(t("maxWeight"), "weight", 10, "number", 'min="1" max="20" required')}<label class="form-label">${t("vehicle")}<select name="vehicle">${["car", "train", "bus"].map((k) => `<option value="${k}">${t(k)}</option>`).join("")}</select></label>${field(t("price") + " (MAD)", "price", 50, "number", 'min="10" max="2000" required')}${field(t("pickup"), "pickup", "", "text", 'maxlength="250"')}${field(t("dropoff"), "dropoff", "", "text", 'maxlength="250"')}<label class="form-label full">${t("notes")}<textarea name="notes" maxlength="500"></textarea></label></div><div class="publish-map"><h3>${icon("route")}${t("routePreview")}</h3><div id="publish-map">${googleMap({ from: search.mode === "travel" ? search.from : "Rabat", to: search.mode === "travel" ? search.to : "Casablanca" })}</div></div><div class="earnings-box"><b>${t("estimatedEarnings")}</b><strong id="earnings">${money(139.5)}</strong><small>${t("earningsNote")}</small></div>${localNote()}<button class="btn wide">${t("publishTrip")}${icon("arrow")}</button></form>`
  );
}
function traveler() {
  return (
    head("become", t("promoSub")) +
    `<section class="traveler-hero"><span class="eyebrow">GOTRAJET · ${t("community")}</span><h1>${t("promoTitle")}</h1><p>${t("onboard2Sub")}</p>${btn(t("start") + icon("arrow"), "publish", "")}</section><div class="benefit-grid">${[
      ["wallet", "estimatedEarnings", "earningsNote"],
      ["route", "publishSub", "promoSub"],
      ["user", "community", "safetySub"],
    ]
      .map(([i, k, s]) => panel(`${icon(i)}<h2>${t(k)}</h2><p>${t(s)}</p>`))
      .join("")}</div>${howSection()}${localNote()}`
  );
}
const CONTACTS = [
  { name: "Youssef B.", type: "travelers", key: "collectedMessage" },
  { name: "Salma E.", type: "travelers", key: "thanksMessage" },
  { name: "Support GOTRAJET", type: "support", key: "supportMessage" },
  { name: "Amine K.", type: "senders", key: "weightMessage" },
  { name: "Nadia R.", type: "senders", key: "meetingMessage" },
];
function chat() {
  let contacts = CONTACTS.filter(
    (p) => messageTab === "all" || p.type === messageTab,
  );
  if (!contacts.some((p) => p.name === activeChat))
    activeChat = contacts[0]?.name || CONTACTS[0].name;
  const person = CONTACTS.find((p) => p.name === activeChat) || {
    name: activeChat,
    key: "collectedMessage",
  };
  return (
    head("messages", t("onboard3Sub")) +
    tabs(
      ["all", "travelers", "senders", "support"],
      messageTab,
      "message-tab",
    ) +
    `<div class="messages-layout"><div class="conversations">${contacts.map((p) => `<button class="conversation ${p.name === activeChat ? "active" : ""}" data-action="open-chat" data-value="${esc(p.name)}">${avatar(p.name)}<span><b>${esc(p.name)}</b><small>${state.messages[p.name]?.length ? esc(state.messages[p.name].at(-1).text || state.messages[p.name].at(-1)) : t(p.key)}</small></span></button>`).join("")}</div><section class="chat"><div class="chat-header">${avatar(activeChat)}<span>${esc(activeChat)}</span><span class="badge">${t("demo")}</span></div><div class="chat-body" aria-live="polite"><div class="bubble">${t(person.key)}</div>${(state.messages[activeChat] || []).map((m) => `<div class="bubble mine">${esc(m.text || m)}${m.at ? `<small>${new Date(m.at).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}</small>` : ""}</div>`).join("")}</div><form id="chat-form" class="chat-form"><input class="chat-input" name="message" aria-label="${t("writeMessage")}" placeholder="${t("writeMessage")}" required maxlength="1000"><button class="btn blue" aria-label="${t("sendMessage")}">${icon("arrow")}</button></form></section></div><p class="map-note">${t("messageNote")}</p>`
  );
}
function notifications() {
  const list = state.notifications.filter(
    (n) => notificationTab === "all" || !n.read,
  );
  return (
    head(
      "notifications",
      t("onboard3Sub"),
      `<button class="text-link" data-action="mark-all-read">${t("markRead")}</button>`,
    ) +
    tabs(["all", "unread"], notificationTab, "notification-tab") +
    panel(
      list.length
        ? list
            .map(
              (n) =>
                `<button class="notification-row ${n.read ? "read" : ""}" data-action="read-notification" data-value="${esc(n.id)}"><span class="notification-icon">${icon(n.key === "newMessage" ? "chat" : n.key === "paymentConfirmed" ? "wallet" : "box")}</span><span><b>${t(n.key)}</b><small>${esc(n.body)}</small></span>${n.read ? "" : '<i class="unread-dot"></i>'}</button>`,
            )
            .join("")
        : `<div class="empty">${t("empty")}</div>`,
    )
  );
}
function settingLink(page, i, label = page, sub = "") {
  return `<a class="setting" href="#${page}"><span class="setting-title">${icon(i)}<span><b>${t(label)}</b>${sub ? `<small>${sub}</small>` : ""}</span></span><span>›</span></a>`;
}
function profile() {
  return (
    head("profile", t("space")) +
    `<div class="profile-card">${avatar(state.profile.name)}<div><h2>${esc(state.profile.name)}</h2><p>${esc(state.profile.email)}</p><span class="stars">★ 4,9 / 5 · ${t("demo")}</span></div><button class="btn" data-action="edit-profile">${t("editProfile")}</button></div>${spaceCards()}<div class="profile-links">${[
      ["addresses", "pin"],
      ["payments", "card"],
      ["wallet", "wallet"],
      ["favorites", "heart"],
      ["reviews", "star"],
      ["parcels", "box"],
      ["trips", "route"],
      ["requests", "bell"],
      ["earnings", "wallet"],
      ["verification", "shield"],
      ["notifications", "bell"],
      ["settings", "settings"],
      ["help", "help"],
      ["about", "leaf"],
    ]
      .map(([p, i]) => settingLink(p, i))
      .join(
        "",
      )}</div><div class="detail-actions">${btn(t("become"), "traveler", "outline")}<button class="btn outline danger" data-action="logout">${icon("logout")}${t("logout")}</button></div>`
  );
}
function addresses() {
  return (
    head(
      "addresses",
      t("space"),
      `<button class="btn" data-action="add-address">${icon("plus")}${t("addAddress")}</button>`,
    ) +
    (state.addresses.length
      ? `<div class="address-grid">${state.addresses.map((a) => panel(`<div class="section-heading"><h2>${esc(a.label)}</h2>${a.default ? badge("defaultAddress") : ""}</div><p>${esc(a.street)}</p><p>${esc(a.city)} · ${esc(a.phone || "")}</p>${googleMap({ q: a.street + ", " + a.city + ", Morocco" }, "small")}<div class="detail-actions"><button class="btn light" data-action="edit-address" data-value="${esc(a.id)}">${t("edit")}</button><button class="text-link" data-action="delete-address" data-value="${esc(a.id)}">${t("delete")}</button>${!a.default ? `<button class="text-link" data-action="default-address" data-value="${esc(a.id)}">${t("makeDefault")}</button>` : ""}</div>`)).join("")}</div>`
      : empty(
          `<button class="btn blue" data-action="add-address">${t("addAddress")}</button>`,
        ))
  );
}
function favorites() {
  const list = allTrips().filter((p) => state.favorites.includes(p.id));
  return (
    head("favorites", t("popular")) +
    (list.length
      ? `<div class="route-grid">${list.map(tripCard).join("")}</div>`
      : empty(btn(t("search"), "results")))
  );
}
function wallet() {
  const transactions = state.transactions,
    cash = state.cashTopups.filter((c) => c.status === "pending");
  return (
    head("wallet", t("transactions")) +
    `<div class="profile-card wallet-card"><div><p>${t("balance")}</p><h1>${money(state.balance)}</h1></div><button class="btn" data-action="topup">${icon("plus")}${t("topup")}</button></div>${localNote()}<div class="detail-actions">${btn(t("payments"), "payments", "outline")}</div>` +
    (cash.length
      ? panel(
          `<h2>${t("cashPending")}</h2>${cash.map((c) => `<div class="payment-row cash-row"><span><b>${esc(c.network)} · ${money(c.amount)}</b><small class="block" dir="ltr">${esc(c.ref)}</small><small class="block">${t("cashExpires")} ${cashDateTime(c.expires)}</small></span><span class="cash-row-actions">${badge(cashStatus(c))}<button class="text-link" data-action="cash-show" data-value="${esc(c.id)}">${t("cashShow")}</button></span></div>`).join("")}`,
        )
      : "") +
    panel(
      `<h2>${t("transactions")}</h2>${transactions.length ? transactions.map((tx) => `<div class="payment-row"><span><b>${t(tx.key)}</b><small class="block">${esc(tx.ref || "")} · ${dateText(tx.date)}</small></span><strong class="${tx.amount > 0 ? "positive" : ""}">${tx.amount > 0 ? "+ " : ""}${money(tx.amount)}</strong></div>`).join("") : `<p>${t("empty")}</p>`}`,
    )
  );
}
function payments() {
  return (
    head(
      "payments",
      t("choosePayment"),
      `<button class="btn" data-action="add-card">${icon("plus")}${t("addCard")}</button>`,
    ) +
    localNote() +
    `<div class="bank-cards">${state.cards.map((c) => `<article class="bank-card"><span>${t("card")} · TEST</span><strong>•••• &nbsp; •••• &nbsp; •••• &nbsp; ${esc(c.last4)}</strong><div><b>${esc(c.holder)}</b><span>${esc(c.expiry)}</span></div><button class="text-link" data-action="delete-card" data-value="${esc(c.id)}">${t("delete")}</button></article>`).join("")}</div>` +
    panel(
      `<form id="default-payment-form"><h2>${t("defaultPayment")}</h2>${["card", "mobileWallet", "cash", "wallet"].map((k) => `<label class="payment-option"><input type="radio" name="method" value="${k}" ${(state.defaultPayment || "card") === k ? "checked" : ""}>${icon(k === "card" ? "card" : "wallet")}${t(k)}</label>`).join("")}<button class="btn blue">${t("save")}</button></form>`,
    )
  );
}
const sampleReviews = [
  {
    name: "Youssef B.",
    route: "Casablanca → Rabat",
    rating: 5,
    fr: "Remise ponctuelle et communication très agréable.",
    en: "On-time handoff and very pleasant communication.",
    ar: "تسليم في الموعد وتواصل لطيف جداً.",
  },
  {
    name: "Salma E.",
    route: "Marrakech → Agadir",
    rating: 4,
    fr: "Colis bien préparé. Merci pour votre confiance !",
    en: "Well-prepared parcel. Thank you for your trust!",
    ar: "طرد مُجهز جيداً. شكراً على ثقتك!",
  },
  {
    name: "Nadia R.",
    route: "Casablanca → Marrakech",
    rating: 5,
    fr: "Mon colis est arrivé le soir même. Simple, rapide et rassurant.",
    en: "My parcel arrived the same evening. Simple, quick and reassuring.",
    ar: "وصل طردي في المساء نفسه. بسيط وسريع ومطمئن.",
  },
];
function reviews() {
  return (
    head("reviews", t("evaluateSub")) +
    tabs(["given", "received"], reviewTab, "review-tab") +
    (reviewTab === "received"
      ? sampleReviews
          .map((r) =>
            panel(
              `<div class="traveler-row">${avatar(r.name)}<div><h3>${r.name}</h3>${stars(r.rating)}</div></div><p>${r[language]}</p><span class="badge">${t("demo")}</span>`,
            ),
          )
          .join("")
      : state.reviews.length
        ? state.reviews
            .map((r) =>
              panel(
                `<div class="section-heading"><h3>${esc(r.name)}</h3>${stars(r.rating)}</div><p>${esc(r.comment)}</p><small>${esc(r.parcelId)} · ${dateText(r.date)}</small>`,
              ),
            )
            .join("")
        : empty(btn(t("evaluate"), "review/GJ1984")))
  );
}
function review() {
  const p = getParcel(route.param || "GJ1984");
  if (!p || p.status !== "delivered")
    return empty(btn(t("parcels"), "parcels"));
  const existing = state.reviews.find((r) => r.parcelId === p.id);
  if (existing) ratingValue = existing.rating;
  return (
    head("evaluate", t("evaluateSub")) +
    `<form class="panel review-form" id="review-form" data-parcel="${esc(p.id)}"><div class="traveler-row">${avatar(p.name)}<div><h2>${esc(p.name)}</h2><p>${esc(p.from)} → ${esc(p.to)} · #${esc(p.id)}</p></div></div><div class="star-picker" role="group" aria-label="${t("rating")}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="${ratingValue >= n ? "selected" : ""}" data-action="star" data-value="${n}" aria-pressed="${ratingValue >= n}" aria-label="${n} / 5">★</button>`).join("")}</div><label class="form-label">${t("comment")}<textarea name="comment" maxlength="1000">${esc(existing?.comment || "")}</textarea></label><button class="btn">${t("submitReview")}</button></form>`
  );
}
function travelerReviews() {
  const p = getTrip(route.param);
  if (!p) return empty();
  return (
    head("travelerReviews", esc(p.name)) +
    panel(
      `<div class="traveler-row">${avatar(p.name)}<div><h2>${esc(p.name)}</h2>${stars(p.rating)} · ${p.reviews} ${t("rating")}</div></div><p class="map-note">${t("demoNote")}</p>`,
    ) +
    sampleReviews
      .map((r) =>
        panel(`<h3>${r.name}</h3>${stars(r.rating)}<p>${r[language]}</p>`),
      )
      .join("")
  );
}
function toggleRow(key, i, label = key) {
  return `<label class="setting"><span class="setting-title">${icon(i)}<b>${t(label)}</b></span><input class="switch" type="checkbox" data-pref="${key}" ${state.preferences[key] ? "checked" : ""}></label>`;
}
function settings() {
  return (
    head("settings", t("space")) +
    panel(
      `<h2>${t("profile")}</h2>${settingLink("profile", "user", "info")}${settingLink("payments", "card")}${settingLink("addresses", "pin")}`,
    ) +
    panel(
      `<h2>${t("settings")}</h2><label class="setting"><span class="setting-title">${icon("globe")}<b>${t("language")}</b></span><select data-language>${Object.entries(
        LANGUAGES,
      )
        .map(
          ([k, v]) =>
            `<option value="${k}" ${k === language ? "selected" : ""}>${v}</option>`,
        )
        .join(
          "",
        )}</select></label>${toggleRow("dark", "sun", "darkMode")}${settingLink("notification-settings", "bell", "notificationPrefs")}${settingLink("security", "shield")}`,
    ) +
    panel(
      `<h2>${t("privacy")}</h2>${settingLink("privacy", "shield")}<div class="detail-actions"><button class="btn outline" data-action="export">${t("exportData")}</button><button class="btn outline danger" data-action="reset">${t("resetData")}</button></div>`,
    )
  );
}
function notificationSettings() {
  return (
    head("notificationPrefs", t("localSaved")) +
    panel(
      ["deliveryAlerts", "messageAlerts", "tripAlerts"]
        .map((k) => toggleRow(k, "bell"))
        .join("") + `<p class="map-note">${t("messageNote")}</p>`,
    )
  );
}
function security() {
  return (
    head("security", t("passwordNote")) +
    panel(
      `<form id="security-form"><h2>${t("changePassword")}</h2><div class="form-grid">${field(t("newPassword"), "password", "", "password", 'required minlength="8" autocomplete="new-password"')}${field(t("confirmPassword"), "confirmation", "", "password", 'required minlength="8" autocomplete="new-password"')}</div><button class="btn blue">${t("save")}</button></form>`,
    ) +
    localNote()
  );
}
function faqContent() {
  const data = {
    fr: [
      [
        "Comment envoyer un colis ?",
        "Décrivez le colis, choisissez les adresses et sélectionnez un voyageur compatible. Vérifiez les frais avant de confirmer.",
      ],
      [
        "Comment proposer un trajet ?",
        "Renseignez votre itinéraire, votre date et la capacité disponible. Choisissez un déplacement que vous avez déjà prévu.",
      ],
      [
        "Quels colis sont acceptés ?",
        "Documents et colis adaptés à la capacité annoncée. Le contenu doit être décrit et accepté par le voyageur. Les marchandises dangereuses, illégales ou non conformes sont exclues.",
      ],
      [
        "Comment confirmer la remise ?",
        "Le destinataire communique le code de remise. Dans cette démonstration, le code de test est affiché sur le formulaire.",
      ],
      [
        "Les paiements et le GPS sont-ils actifs ?",
        "Non. Le solde, les paiements, la carte et les notifications sont simulés. Les connexions aux prestataires restent à configurer.",
      ],
      [
        "Où sont mes données ?",
        "Sur cet appareil, dans le stockage local de votre navigateur. Exportez-les ou supprimez-les depuis les paramètres.",
      ],
    ],
    en: [
      [
        "How do I send a parcel?",
        "Describe the parcel, add the addresses and choose a compatible traveler. Check the fees before confirming.",
      ],
      [
        "How do I offer a trip?",
        "Enter your route, date and capacity. Choose a journey you already planned.",
      ],
      [
        "Which parcels are accepted?",
        "Documents and items within the stated capacity. Describe the contents and get the traveler’s agreement. Dangerous, illegal or non-compliant goods are excluded.",
      ],
      [
        "How do I confirm a handoff?",
        "The recipient shares a handoff code. In this demo the test code is displayed on the form.",
      ],
      [
        "Are payments and GPS live?",
        "No. Balances, payments, the map and notifications are simulated. Provider integrations still need to be configured.",
      ],
      [
        "Where is my data?",
        "On this device in browser local storage. Export or clear it in settings.",
      ],
    ],
    ar: [
      [
        "كيف أرسل طرداً؟",
        "صف الطرد وأضف العناوين واختر مسافراً مناسباً. راجع الرسوم قبل التأكيد.",
      ],
      [
        "كيف أعرض رحلة؟",
        "أدخل المسار والتاريخ والسعة المتاحة لرحلة خططت لها مسبقاً.",
      ],
      [
        "ما الطرود المقبولة؟",
        "وثائق وطرود ضمن السعة المعلنة. يجب وصف المحتوى وموافقة المسافر. تُستثنى المواد الخطرة وغير القانونية وغير المطابقة.",
      ],
      [
        "كيف أؤكد التسليم؟",
        "يشارك المستلم رمز التسليم. يظهر رمز الاختبار في نموذج النسخة التجريبية.",
      ],
      [
        "هل الدفع وGPS حقيقيان؟",
        "لا. الرصيد والدفع والخريطة والإشعارات محاكاة. ربط الخدمات يحتاج إلى إعداد.",
      ],
      [
        "أين توجد بياناتي؟",
        "على هذا الجهاز في التخزين المحلي للمتصفح. يمكنك تصديرها أو حذفها من الإعدادات.",
      ],
    ],
  };
  return data[language]
    .map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`)
    .join("");
}
function help() {
  return (
    head("help", t("safetySub")) +
    `<div class="benefit-grid">${[
      ["support", "chat", "contactSupport"],
      ["report", "help", "report"],
      ["terms", "shield", "terms"],
    ]
      .map(
        ([p, i, k]) =>
          `<a href="#${p}" class="panel help-card">${icon(i)}<h2>${t(k)}</h2>${icon("arrow")}</a>`,
      )
      .join("")}</div>` +
    panel(`<h2>${t("faq")}</h2>${faqContent()}`) +
    settingLink("tickets", "chat", "myRequests")
  );
}
function supportForm() {
  return (
    head(
      route.page === "report" ? "report" : "contactSupport",
      t("messageNote"),
    ) +
    `<form class="panel" id="support-form"><div class="form-grid">${field(t("subject"), "subject", "", "text", 'required maxlength="120"')}${field(t("email"), "email", state.profile.email, "email", "required")}<label class="form-label full">${t("description")}<textarea name="description" required maxlength="2000"></textarea></label></div>${localNote()}<button class="btn">${t("save")}</button></form>`
  );
}
function tickets() {
  return (
    head("myRequests") +
    (state.tickets.length
      ? state.tickets
          .map((r) =>
            panel(
              `<div class="section-heading"><h3>${esc(r.subject)}</h3>${badge("pending")}</div><p>${esc(r.description)}</p><small>#${esc(r.id)} · ${dateText(r.date)}</small>`,
            ),
          )
          .join("")
      : empty(btn(t("contactSupport"), "support")))
  );
}
function about() {
  return (
    head("about", t("tagline")) +
    `<section class="hero"><div class="eyebrow">GOTRAJET · MAROC</div><h2>${t("impact")}</h2><p>${t("impactSub")}</p></section>${howSection()}<div class="benefit-grid">${[
      ["clock", "faster"],
      ["pin", "closer"],
      ["leaf", "greener"],
    ]
      .map(([i, k]) => panel(`${icon(i)}<h2>${t(k)}</h2>`))
      .join(
        "",
      )}</div>${btn(t("start"), "home", "")} ${btn(t("impact"), "impact", "outline")}`
  );
}
function impact() {
  return `<section class="impact-scene"><a href="#home" class="auth-brand">${brand()}</a><h1>${t("impact")}</h1><p>${t("impactSub")}</p><div class="welcome-benefits">${[
    ["clock", "faster"],
    ["pin", "closer"],
    ["leaf", "greener"],
  ]
    .map(([i, k]) => `<div>${icon(i)}<b>${t(k)}</b></div>`)
    .join("")}</div>${btn(t("home") + icon("arrow"), "home", "")}</section>`;
}
function legal() {
  const isPrivacy = route.page === "privacy";
  const copy = {
    fr: isPrivacy
      ? [
          "Vos données dans cette démonstration",
          "Les informations de profil, adresses, messages, trajets, avis et réservations sont stockées localement dans votre navigateur. Cette version ne propose pas de compte sécurisé et ne doit pas recevoir de données sensibles.",
          "Les polices et les photos sont incluses dans le site. Les cartes sont fournies par Google Maps : lorsqu’une carte s’affiche, votre navigateur contacte les serveurs de Google, soumis à la politique de confidentialité de Google. Aucun numéro de carte complet, cryptogramme ou mot de passe n’est enregistré.",
          "Vous pouvez exporter et effacer les données locales dans les paramètres. Les boutons sociaux ne connectent aucun compte réel.",
        ]
      : [
          "Conditions de la démonstration",
          "Ce site illustre les parcours GOTRAJET. Les réservations, prix, soldes, paiements, profils, évaluations et positions sont des données de démonstration.",
          "Aucun contrat de transport, couverture d’assurance, paiement, remboursement ou vérification d’identité réel n’est fourni par cette version. Les demandes de support ne sont pas envoyées.",
          "Avant une ouverture commerciale, les conditions du service, les règles applicables et les intégrations devront être validées et configurées.",
        ],
    en: isPrivacy
      ? [
          "Your data in this demo",
          "Profiles, addresses, messages, trips, reviews and bookings are saved locally in your browser. This version does not provide a secure account and should not receive sensitive data.",
          "Fonts and photos are included in the website. Maps are provided by Google Maps: when a map is shown, your browser contacts Google’s servers, subject to Google’s privacy policy. No complete card number, security code or password is stored.",
          "Export and clear local data in settings. Social sign-in buttons do not connect real accounts.",
        ]
      : [
          "Demo terms",
          "This site illustrates GOTRAJET flows. Bookings, prices, balances, payments, profiles, reviews and locations are demonstration data.",
          "This version does not provide a real transport contract, insurance, payment, refund or identity verification. Support requests are not delivered.",
          "Before a commercial launch, service terms, applicable rules and integrations need to be validated and configured.",
        ],
    ar: isPrivacy
      ? [
          "بياناتك في النسخة التجريبية",
          "تُحفظ معلومات الملف والعناوين والرسائل والرحلات والتقييمات والحجوزات محلياً في متصفحك. لا توفر هذه النسخة حساباً آمناً ولا ينبغي إدخال بيانات حساسة.",
          "الخطوط والصور مضمّنة في الموقع. الخرائط مقدّمة من خرائط Google: عند عرض خريطة يتصل متصفحك بخوادم Google وفق سياسة الخصوصية الخاصة بها. لا يتم تخزين رقم البطاقة الكامل أو رمز الأمان أو كلمة المرور.",
          "يمكن تصدير البيانات المحلية وحذفها من الإعدادات. أزرار الدخول الاجتماعي لا تربط حسابات حقيقية.",
        ]
      : [
          "شروط النسخة التجريبية",
          "يوضح الموقع مسارات GOTRAJET. الحجوزات والأسعار والأرصدة والمدفوعات والملفات والتقييمات والمواقع بيانات تجريبية.",
          "لا توفر هذه النسخة عقد نقل أو تأميناً أو دفعاً أو استرداداً أو تحقق هوية حقيقياً. لا تُرسل طلبات الدعم.",
          "قبل الإطلاق التجاري يجب مراجعة شروط الخدمة والقواعد المطبقة وإعداد الخدمات المتصلة.",
        ],
  };
  const c = copy[language];
  return (
    head(isPrivacy ? "privacy" : "terms") +
    panel(
      `<h2>${c[0]}</h2>${c
        .slice(1)
        .map((p) => `<p>${p}</p>`)
        .join(
          "",
        )}<div class="detail-actions">${btn(t("settings"), "settings", "outline")}${btn(t("help"), "help", "outline")}</div>`,
    )
  );
}
function directory() {
  const entries = [
    ["welcome", "welcome", "home"],
    ["onboarding", "how", "route"],
    ["register", "createAccount", "user"],
    ["login", "login", "shield"],
    ["forgot", "resetPassword", "shield"],
    ["home", "home", "home"],
    ["send", "send", "box"],
    ["results", "results", "search"],
    ["detail/T4", "tripDetails", "car"],
    ["checkout/T4", "reservation", "card"],
    ["tracking/GJ2048", "tracking", "pin"],
    ["parcels", "parcels", "box"],
    ["trips", "trips", "route"],
    ["publish", "propose", "plus"],
    ["traveler", "become", "car"],
    ["messages", "messages", "chat"],
    ["notifications", "notifications", "bell"],
    ["profile", "profile", "user"],
    ["addresses", "addresses", "pin"],
    ["favorites", "favorites", "heart"],
    ["payments", "payments", "card"],
    ["wallet", "wallet", "wallet"],
    ["reviews", "reviews", "star"],
    ["review/GJ1984", "evaluate", "star"],
    ["settings", "settings", "settings"],
    ["notification-settings", "notificationPrefs", "bell"],
    ["security", "security", "shield"],
    ["help", "help", "help"],
    ["support", "contactSupport", "chat"],
    ["report", "report", "help"],
    ["tickets", "myRequests", "chat"],
    ["terms", "terms", "shield"],
    ["privacy", "privacy", "shield"],
    ["about", "about", "leaf"],
    ["impact", "impact", "leaf"],
    ["parcel/GJ2048", "parcel", "box"],
    ["success/GJ2048", "bookingSuccess", "check"],
    ["traveler-reviews/T4", "travelerReviews", "star"],
    ["space-sender", "senderSpace", "box"],
    ["space-traveler", "travelerSpace", "car"],
    ["trip/MT1", "myTrip", "route"],
    ["requests", "requests", "bell"],
    ["request/RQ-A1", "requestDetail", "bell"],
    ["earnings", "earnings", "wallet"],
    ["verification", "verification", "shield"],
    ["directory", "screenDirectory", "globe"],
  ];
  return (
    head("screenDirectory", t("screenDirectorySub")) +
    `<div class="screen-grid">${entries.map(([p, k, i], n) => `<a href="#${p}" class="screen-tile"><span class="screen-num">${String(n + 1).padStart(2, "0")}</span>${icon(i)}<h3>${t(k)}</h3><span>→</span></a>`).join("")}</div>`
  );
}
/* =====================================================================
   Two spaces on one account
   - Espace Expéditeur (sender): dashboard, shipments, full parcel detail.
   - Espace Voyageur (traveller): dashboard, trips, parcels on board,
     requests to accept/decline, earnings, verification documents.
   A switch in the side menu (top bar on small screens) changes space;
   opening a page of the other space switches automatically.
   Bookings now wait for the traveller's acceptance.
   ===================================================================== */
const SENDER_PAGES = ["space-sender", "home", "results", "detail", "checkout", "success", "send", "parcels", "parcel", "tracking", "review", "favorites", "traveler-reviews"];
const TRAVELER_PAGES = ["space-traveler", "trips", "trip", "requests", "request", "publish", "earnings", "verification", "traveler"];
const SPACE_NAV = {
  sender: [
    ["space-sender", "home", "dashboard"],
    ["home", "search", "findTrip"],
    ["parcels", "box", "myShipments"],
    ["send", "plus", "navSend"],
    ["messages", "chat", "messages"],
    ["profile", "user", "profile"],
  ],
  traveler: [
    ["space-traveler", "home", "dashboard"],
    ["trips", "route", "trips"],
    ["requests", "bell", "requests"],
    ["publish", "plus", "publish"],
    ["earnings", "wallet", "earnings"],
    ["messages", "chat", "messages"],
  ],
};
const COMMISSION = 0.07;
const round2 = (n) => Math.round(Number(n) * 100) / 100;
const netOf = (price) => round2(Number(price) * (1 - COMMISSION));

function spaceSwitch(cls = "") {
  return `<div class="space-switch ${cls}" role="group" aria-label="${t("switchSpace")}">${[
    ["sender", "box", "asSender"],
    ["traveler", "car", "asTraveler"],
  ]
    .map(
      ([s, i, k]) =>
        `<button type="button" class="${state.space === s ? "active" : ""}" aria-pressed="${state.space === s}" data-action="switch-space" data-value="${s}">${icon(i)}<span>${t(k)}</span></button>`,
    )
    .join("")}</div>`;
}

/* ---------- Demo data for the traveller space ---------- */
const SAMPLE_MY_TRIPS = [
  { id: "MT1", from: "Casablanca", to: "Marrakech", days: 2, time: "08:30", seats: 4, weight: 20, price: 60, vehicle: "car", vehicleModel: "Dacia Logan · gris", pickup: "Casablanca · Gare Casa-Voyageurs", dropoff: "Marrakech · Gare routière Bab Doukkala", notes: "Départ ponctuel, colis bien emballés svp.", status: "upcoming" },
  { id: "MT2", from: "Rabat", to: "Fès", days: -6, time: "17:00", seats: 3, weight: 15, price: 70, vehicle: "car", vehicleModel: "Dacia Logan · gris", pickup: "Rabat · Agdal, avenue de France", dropoff: "Fès · Place Florence", notes: "", status: "completed" },
];
const SAMPLE_INCOMING = [
  { id: "RQ-A1", tripId: "MT1", sender: "Amine K.", senderRating: 4.7, senderPhone: "+212 600 000 101", recipient: "Khadija M.", recipientPhone: "+212 600 000 102", type: "small", length: 35, width: 25, height: 20, weight: 4, content: "Livres et documents", value: 300, notes: "Fragile, garder à plat.", insurance: true, pickup: "12 rue Ibn Batouta, Casablanca", dropoff: "45 avenue Mohammed V, Marrakech", price: 60, status: "awaiting", code: "3417", hoursAgo: 2 },
  { id: "RQ-A2", tripId: "MT1", sender: "Nadia R.", senderRating: 4.9, senderPhone: "+212 600 000 103", recipient: "Omar B.", recipientPhone: "+212 600 000 104", type: "medium", length: 50, width: 40, height: 30, weight: 8, content: "Vêtements", value: 450, notes: "", insurance: false, pickup: "Maârif, rue Abou Bakr Seddik, Casablanca", dropoff: "Guéliz, rue de la Liberté, Marrakech", price: 60, status: "accepted", code: "5821", hoursAgo: 20 },
  { id: "RQ-A3", tripId: "MT1", sender: "Salma E.", senderRating: 4.8, senderPhone: "+212 600 000 105", recipient: "Yassine H.", recipientPhone: "+212 600 000 106", type: "documents", length: 32, width: 23, height: 2, weight: 0.5, content: "Contrat signé (original)", value: 0, notes: "Remettre en main propre uniquement.", insurance: false, pickup: "Casablanca · Gare Casa-Voyageurs", dropoff: "Marrakech · Gare routière Bab Doukkala", price: 60, status: "awaiting", code: "9024", hoursAgo: 1 },
  { id: "RQ-B1", tripId: "MT2", sender: "Youssef B.", senderRating: 4.9, senderPhone: "+212 600 000 107", recipient: "Fatima Z.", recipientPhone: "+212 600 000 108", type: "small", length: 30, width: 20, height: 15, weight: 3, content: "Produits artisanaux", value: 200, notes: "", insurance: false, pickup: "Hay Riad, Rabat", dropoff: "Fès el-Bali, Fès", price: 70, status: "delivered", code: "1102", hoursAgo: 150, deliveredDays: -6 },
  { id: "RQ-B2", tripId: "MT2", sender: "Karim T.", senderRating: 4.6, senderPhone: "+212 600 000 110", recipient: "Saïd O.", recipientPhone: "+212 600 000 111", type: "medium", length: 45, width: 35, height: 25, weight: 6, content: "Pièces automobiles", value: 600, notes: "Lourd d’un côté.", insurance: true, pickup: "Agdal, Rabat", dropoff: "Route d’Imouzzer, Fès", price: 70, status: "delivered", code: "7730", hoursAgo: 152, deliveredDays: -6 },
];
const DOCS = [
  ["id", "docId", "card"],
  ["phone", "docPhone", "chat"],
  ["photo", "docPhoto", "user"],
  ["license", "docLicense", "car"],
  ["vehicle", "docVehicle", "shield"],
];

function myTripsAll() {
  return [
    ...state.published.map((p) => ({ ...p, vehicleModel: p.vehicleModel || t(p.vehicle) })),
    ...SAMPLE_MY_TRIPS.map((p) => ({ ...p, date: futureDate(p.days), ...state.travelUpdates[p.id] })),
  ];
}
function getMyTrip(tid) {
  return myTripsAll().find((p) => p.id === tid);
}
/* Own records are edited in place; demo records keep their changes in travelUpdates. */
function changeTravel(list, itemId, updates) {
  const own = list.find((x) => x.id === itemId);
  if (own) Object.assign(own, updates);
  else state.travelUpdates[itemId] = { ...state.travelUpdates[itemId], ...updates };
  persist();
}
function incomingAll() {
  return [
    ...state.incoming,
    ...SAMPLE_INCOMING.map((r) => ({
      ...r,
      receivedAt: new Date(Date.now() - r.hoursAgo * 3600000).toISOString(),
      deliveredAt: r.deliveredDays != null ? futureDate(r.deliveredDays) : undefined,
      ...state.travelUpdates[r.id],
    })),
  ].sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)));
}
function getIncoming(rid) {
  return incomingAll().find((r) => r.id === rid);
}
const reqTrip = (r) => getMyTrip(r.tripId) || {};
const ON_TRIP = ["accepted", "pickedUp", "delivered"];
function tripLoad(trip) {
  const list = incomingAll().filter((r) => r.tripId === trip.id && ON_TRIP.includes(r.status));
  return {
    list,
    count: list.length,
    kg: round2(list.reduce((s, r) => s + Number(r.weight), 0)),
    gross: list.reduce((s, r) => s + Number(r.price), 0),
  };
}
function earningsSummary() {
  const all = incomingAll();
  const delivered = all.filter((r) => r.status === "delivered");
  const month = today().slice(0, 7);
  const sum = (list) => round2(list.reduce((s, r) => s + netOf(r.price), 0));
  const total = sum(delivered);
  const withdrawn = round2(state.payouts.reduce((s, p) => s + Number(p.amount), 0));
  return {
    delivered,
    total,
    thisMonth: sum(delivered.filter((r) => String(r.deliveredAt || "").startsWith(month))),
    pending: sum(all.filter((r) => ["accepted", "pickedUp"].includes(r.status))),
    withdrawn,
    available: Math.max(0, round2(total - withdrawn)),
  };
}

/* ---------- Sender: travellers accept requests (simulated) ---------- */
function simulateTravelerResponses() {
  let changed = false;
  state.bookings.forEach((b) => {
    if (b.status === "awaiting" && Date.now() - (b.createdAt || 0) > 5000) {
      b.status = "reserved";
      b.acceptedAt = new Date().toISOString();
      changed = true;
      notify("requestAccepted", `${b.name} · ${b.from} → ${b.to}`, "parcel/" + b.id);
    }
  });
  if (changed) persist();
  return changed;
}
function scheduleTravelerResponse() {
  setTimeout(() => {
    if (!simulateTravelerResponses()) return;
    toast(t("requestAcceptedToast"));
    if (["parcel", "parcels", "space-sender", "success", "tracking"].includes(route.page)) render();
    else updateChrome();
  }, 5500);
}

/* ---------- Shared building blocks ---------- */
const SENDER_STEPS = ["requestSent", "acceptedByTraveler", "onRoad", "delivered"];
const senderStepIndex = (status) => ({ awaiting: 0, reserved: 1, transit: 2, delivered: 3 })[status] ?? 0;
function stepper(keys, current, cancelled = false) {
  return `<ol class="stepper ${cancelled ? "is-cancelled" : ""}">${keys
    .map(
      (k, i) =>
        `<li class="${i < current || (i === current && current === keys.length - 1) ? "done" : i === current ? "current" : ""}"><span>${i < current || (i === current && current === keys.length - 1) ? icon("check") : i + 1}</span><b>${t(k)}</b></li>`,
    )
    .join("")}</ol>`;
}
function kpi(i, value, label, tone = "") {
  return `<div class="kpi ${tone}"><span class="kpi-icon">${icon(i)}</span><strong>${value}</strong><small>${label}</small></div>`;
}
function spaceHero(kind) {
  const sender = kind === "sender";
  return `<section class="space-hero ${kind}"><div><span class="eyebrow">GOTRAJET · ${t(sender ? "asSender" : "asTraveler")}</span><h1>${t(sender ? "senderSpace" : "travelerSpace")}</h1><p>${t(sender ? "senderSpaceSub" : "travelerSpaceSub")}</p></div><div class="space-hero-actions">${sender ? btn(icon("plus") + t("send"), "send", "") : btn(icon("plus") + t("propose"), "publish", "")}<button type="button" class="btn ghost" data-action="switch-space" data-value="${sender ? "traveler" : "sender"}">${icon(sender ? "car" : "box")}${t(sender ? "travelerSpace" : "senderSpace")}</button></div></section>`;
}
/* Rows are [labelKey, html]; callers escape user data. */
function infoList(rows) {
  return `<dl class="info-list">${rows
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `<div><dt>${t(k)}</dt><dd>${v}</dd></div>`)
    .join("")}</dl>`;
}
function infoCard(i, titleKey, body) {
  return `<section class="panel info-card"><h2>${icon(i)}${t(titleKey)}</h2>${body}</section>`;
}
const parcelDims = (p) => (p.length ? `${esc(p.length)} × ${esc(p.width)} × ${esc(p.height)} cm` : "—");
function priceParts(p) {
  const qty = Number(p.quantity || 1),
    total = Number(p.price || 0),
    insurance = p.insurance ? 10 * qty : 0,
    fee = 10 * qty;
  return { transport: Math.max(0, total - fee - insurance), fee, insurance, total };
}
const payState = (status) => (status === "cancelled" ? "payRefunded" : status === "delivered" ? "payReleased" : "payHeld");
const travelerOf = (p) => getTrip(p.tripId) || BASE_TRIPS.find((x) => x.name === p.name) || {};
function dataTable(headers, rows) {
  return `<div class="data-table" style="--cols:${headers.length}"><div class="dt-row dt-head">${headers.map((h) => `<span>${h}</span>`).join("")}</div>${rows.join("")}</div>`;
}

/* ---------- Espace Expéditeur ---------- */
function shipmentRow(p) {
  return `<a class="dt-row" href="#parcel/${esc(p.id)}"><span data-label="${t("parcel")}"><b>#${esc(p.id)}</b></span><span data-label="${t("routeLabel")}">${esc(p.from)} → ${esc(p.to)}</span><span data-label="${t("date")}">${dateText(p.date)}</span><span data-label="${t("traveler")}">${esc(p.name)}</span><span data-label="${t("statusLabel")}">${badge(p.status)}</span><span data-label="${t("amount")}"><b>${money(p.price)}</b></span></a>`;
}
function focusParcel(p) {
  const trip = travelerOf(p);
  return `<section class="panel focus-card"><div class="section-heading"><div><span class="eyebrow-label">${t("focusParcel")}</span><h2>${esc(p.from)} → ${esc(p.to)}</h2><small class="muted">#${esc(p.id)} · ${dateText(p.date)}${p.time ? " · " + esc(p.time) : ""}</small></div>${badge(p.status)}</div>${stepper(SENDER_STEPS, senderStepIndex(p.status))}<div class="focus-grid"><div class="traveler-row">${avatar(p.name)}<div><b>${esc(p.name)}</b><div>${stars(trip.rating || 4.8)} · ${esc(trip.vehicle || "")}</div></div></div><div class="code-mini"><small>${t("code")}</small><b>${esc(p.code || "—")}</b></div><div class="detail-actions">${btn(t("allDetails"), "parcel/" + p.id, "")}${btn(t("track"), "tracking/" + p.id, "outline")}<button class="btn outline" data-action="contact-traveler" data-value="${esc(p.name)}">${icon("chat")}${t("contact")}</button></div></div></section>`;
}
function senderSpace() {
  const all = allParcels();
  const active = all.filter((p) => ["awaiting", "reserved", "transit"].includes(p.status));
  const delivered = all.filter((p) => p.status === "delivered");
  const month = today().slice(0, 7);
  const spent = all
    .filter((p) => p.status !== "cancelled" && String(p.date).startsWith(month))
    .reduce((s, p) => s + Number(p.price || 0), 0);
  const focus = all.find((p) => p.status === "transit") || active[0];
  const toReview = delivered.filter((p) => !state.reviews.some((r) => r.parcelId === p.id)).length;
  return (
    spaceHero("sender") +
    `<div class="kpi-grid">${kpi("box", active.length, t("kpiActive"), "orange")}${kpi("check", delivered.length, t("kpiDelivered"), "green")}${kpi("wallet", money(spent), t("kpiSpent"), "blue")}${kpi("clock", all.filter((p) => p.status === "awaiting").length, t("kpiAwaiting"))}</div>` +
    (focus ? focusParcel(focus) : "") +
    panel(
      `<div class="section-heading"><h2>${t("myShipments")}</h2><a class="text-link" href="#parcels">${t("seeAll")} →</a></div>${all.length ? dataTable([t("parcel"), t("routeLabel"), t("date"), t("traveler"), t("statusLabel"), t("amount")], all.slice(0, 6).map(shipmentRow)) : `<p class="muted">${t("empty")}</p>`}`,
    ) +
    (state.requests.length
      ? panel(
          `<h2>${t("openRequests")}</h2>${state.requests
            .map(
              (p) =>
                `<div class="payment-row"><span><b>#${esc(p.id)}</b> · ${esc(p.from)} → ${esc(p.to)} · ${dateText(p.date)}</span><button class="btn light" data-action="request-search" data-value="${esc(p.id)}">${t("search")}</button></div>`,
            )
            .join("")}`,
        )
      : "") +
    `<div class="quick-grid">${[
      ["addresses", "pin"],
      ["payments", "card"],
      ["wallet", "wallet"],
      ["reviews", "star", toReview],
    ]
      .map(([p, i, n]) => `<a class="quick-link" href="#${p}">${icon(i)}<span>${t(p)}</span>${n ? `<em>${n}</em>` : ""}</a>`)
      .join("")}</div>`
  );
}
function envoiCard(p) {
  const trip = travelerOf(p);
  return `<article class="envoi-card"><header><span class="box-icon">${icon(p.type === "documents" ? "card" : "box")}</span><div><h3>${esc(p.from)} → ${esc(p.to)}</h3><small>#${esc(p.id)} · ${dateText(p.date)}${p.time ? " · " + esc(p.time) : ""}</small></div>${badge(p.status)}</header>${stepper(SENDER_STEPS, senderStepIndex(p.status), p.status === "cancelled")}<div class="envoi-meta"><span>${icon("user")}${esc(p.name)} · ★ ${esc(trip.rating || "—")}</span><span>${icon("box")}${t(p.type || "small")} · ${esc(p.weight)} kg</span><span>${icon("pin")}${esc(p.recipient || "—")}</span><strong>${money(p.price)}</strong></div><footer>${btn(t("allDetails") + icon("arrow", "flip"), "parcel/" + p.id, "light")}${!["cancelled", "delivered"].includes(p.status) ? btn(t("track"), "tracking/" + p.id, "outline") : ""}</footer></article>`;
}
function parcels() {
  const list = allParcels().filter((p) =>
    parcelTab === "history"
      ? ["delivered", "cancelled"].includes(p.status)
      : !["delivered", "cancelled"].includes(p.status),
  );
  const requests = state.requests.filter(() => parcelTab === "inProgress");
  return (
    head("myShipments", t("senderSpaceSub"), btn(icon("plus") + t("send"), "send", "")) +
    tabs(["inProgress", "history"], parcelTab, "parcel-tab") +
    `<div class="envoi-list">${list.map(envoiCard).join("")}${requests
      .map(
        (p) =>
          `<article class="panel"><div class="section-heading"><h3>${t("request")} #${esc(p.id)}</h3>${badge("pending")}</div><p>${esc(p.from)} → ${esc(p.to)} · ${dateText(p.date)}</p><p>${esc(p.content)} · ${esc(p.weight)} kg</p><button class="btn blue" data-action="request-search" data-value="${esc(p.id)}">${t("search")}</button></article>`,
      )
      .join("")}${!list.length && !requests.length ? empty(btn(t("send"), "send")) : ""}</div>`
  );
}
function parcelDetails() {
  const p = getParcel(route.param);
  if (!p) return head("parcel") + empty(btn(t("parcels"), "parcels"));
  const trip = travelerOf(p),
    price = priceParts(p),
    cancelled = p.status === "cancelled";
  const actions = [
    !cancelled ? btn(icon("pin") + t("track"), "tracking/" + p.id, "") : "",
    `<button class="btn outline" data-action="contact-traveler" data-value="${esc(p.name)}">${icon("chat")}${t("contact")}</button>`,
    p.status === "delivered" ? btn(icon("star") + t("evaluate"), "review/" + p.id, "outline") : "",
    `<button class="btn outline" data-action="receipt" data-value="${esc(p.id)}">${icon("card")}${t("downloadReceipt")}</button>`,
    ["awaiting", "reserved", "transit"].includes(p.status)
      ? `<button class="btn outline danger" data-action="cancel-booking" data-value="${esc(p.id)}">${t("cancelBooking")}</button>`
      : "",
    btn(t("reportProblem"), "report", "ghost"),
  ].join("");
  return (
    head("parcel", `#${esc(p.id)} · ${esc(p.from)} → ${esc(p.to)}`, badge(p.status)) +
    panel(stepper(SENDER_STEPS, senderStepIndex(p.status), cancelled) + `<div class="detail-actions">${actions}</div>`, "stepper-panel") +
    `<div class="detail-grid">${infoCard(
      "box",
      "parcelInfo",
      infoList([
        ["type", esc(t(p.type || "small"))],
        ["dimensions", parcelDims(p)],
        ["weight", esc(p.weight) + " kg"],
        ["quantity", esc(p.quantity || 1)],
        ["content", esc(p.content || "—")],
        ["notes", esc(p.notes || "—")],
        ["insurance", t(p.insurance ? "yes" : "no")],
      ]),
    )}${infoCard(
      "car",
      "travelerTrip",
      `<div class="traveler-row">${avatar(p.name)}<div><b>${esc(p.name)}</b><div>${stars(trip.rating || 4.8)} <small>(${esc(trip.reviews || 0)})</small></div></div></div>` +
        infoList([
          ["vehicle", esc(trip.vehicle || "—")],
          ["departureDate", dateText(p.date) + (p.time ? " · " + esc(p.time) : "")],
          ["duration", esc(trip.duration || "—")],
        ]) +
        (trip.id ? `<a class="text-link" href="#traveler-reviews/${esc(trip.id)}">${t("travelerReviews")} →</a>` : ""),
    )}${infoCard(
      "pin",
      "addressesRecipient",
      infoList([
        ["pickup", esc(p.pickup || p.from + " · Centre")],
        ["dropoff", esc(p.dropoff || p.to + " · Centre")],
        ["recipientLabel", esc(p.recipient || "—")],
        ["recipientPhone", esc(p.recipientPhone || "—")],
      ]),
    )}${infoCard(
      "wallet",
      "priceDetail",
      infoList([
        ["transport", money(price.transport)],
        ["serviceFee", money(price.fee)],
        ["insurance", money(price.insurance)],
        ["paymentMethod", esc(t(p.payment || "card"))],
        ["paymentStatus", `<span class="pay-state ${payState(p.status)}">${t(payState(p.status))}</span>`],
      ]) + `<div class="total-row"><b>${t("total")}</b><strong>${money(price.total)}</strong></div>`,
    )}</div>` +
    (!cancelled && p.code
      ? `<section class="panel code-panel"><div><h2>${icon("shield")}${t("code")}</h2><p>${t("codeShare")}</p></div><div class="code-big">${String(p.code)
          .split("")
          .map((d) => `<b>${esc(d)}</b>`)
          .join("")}</div></section>`
      : "") +
    localNote()
  );
}

/* ---------- Espace Voyageur ---------- */
function capacityBars(trip) {
  const load = tripLoad(trip);
  const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);
  return `<div class="capacity"><div><span>${t("placesUsed")}</span><b>${load.count} / ${esc(trip.seats)}</b><i><em style="width:${pct(load.count, trip.seats)}%"></em></i></div><div><span>${t("weightLoaded")}</span><b>${load.kg} kg</b><i><em style="width:${pct(load.kg, trip.seats * trip.weight)}%"></em></i></div></div>`;
}
function requestActions(r, compact = false) {
  const contact = `<button class="btn outline" data-action="contact-traveler" data-value="${esc(r.sender)}">${icon("chat")}${t("contactSender")}</button>`;
  if (r.status === "awaiting")
    return `<button class="btn" data-action="accept-request" data-value="${esc(r.id)}">${icon("check")}${t("accept")}</button><button class="btn outline" data-action="decline-request" data-value="${esc(r.id)}">${t("decline")}</button>${compact ? btn(t("details"), "request/" + r.id, "ghost") : ""}`;
  if (r.status === "accepted")
    return `<button class="btn blue" data-action="pickup-request" data-value="${esc(r.id)}">${icon("box")}${t("confirmPickup")}</button>${compact ? "" : contact}`;
  if (r.status === "pickedUp")
    return `<button class="btn" data-action="deliver-request" data-value="${esc(r.id)}">${icon("shield")}${t("confirmDelivery")}</button>${compact ? "" : contact}`;
  return compact ? btn(t("details"), "request/" + r.id, "ghost") : "";
}
function requestMini(r) {
  const trip = reqTrip(r);
  return `<article class="req-mini">${avatar(r.sender)}<div><b>${esc(r.sender)} <small>★ ${esc(r.senderRating)}</small></b><small>${esc(trip.from || "")} → ${esc(trip.to || "")} · ${t(r.type)} · ${esc(r.weight)} kg</small></div><strong>${money(r.price)}</strong><div class="req-actions">${requestActions(r, true)}</div></article>`;
}
function requestCard(r) {
  const trip = reqTrip(r);
  const visible = ON_TRIP.includes(r.status);
  const phone = (n) => (visible ? `<small>${esc(n)}</small>` : `<small class="muted">${t("phoneHidden")}</small>`);
  return `<article class="req-card req-${esc(r.status)}"><header>${avatar(r.sender)}<div><h3>${esc(r.sender)} <small>★ ${esc(r.senderRating)}</small></h3><small>${t("receivedAgo")} ${dateText(String(r.receivedAt).slice(0, 10))} · #${esc(r.id)}</small></div>${badge(r.status)}<div class="req-price"><strong>${money(netOf(r.price))}</strong><small>${t("net")}</small></div></header><div class="req-grid"><div><h4>${icon("box")}${t("parcelInfo")}</h4>${infoList([
    ["type", t(r.type)],
    ["dimensions", parcelDims(r)],
    ["weight", esc(r.weight) + " kg"],
    ["content", esc(r.content)],
    ["declaredValue", r.value ? money(r.value) : "—"],
    ["insurance", t(r.insurance ? "yes" : "no")],
    ["notes", esc(r.notes || "—")],
  ])}</div><div><h4>${icon("route")}${t("routeLabel")}</h4>${infoList([
    ["routeLabel", `${esc(trip.from || "")} → ${esc(trip.to || "")}`],
    ["departureDate", trip.date ? dateText(trip.date) + " · " + esc(trip.time) : "—"],
    ["pickup", esc(r.pickup)],
    ["dropoff", esc(r.dropoff)],
    r.deliveredAt ? ["delivered", dateText(r.deliveredAt)] : ["price", money(r.price)],
  ])}</div><div><h4>${icon("user")}${t("contacts")}</h4>${infoList([
    ["sender", `${esc(r.sender)}<br>${phone(r.senderPhone)}`],
    ["recipientLabel", `${esc(r.recipient)}<br>${phone(r.recipientPhone)}`],
  ])}</div></div><footer>${requestActions(r)}${route.page !== "request" ? btn(t("details"), "request/" + r.id, "ghost") : ""}</footer></article>`;
}
function verificationBanner() {
  const n = DOCS.filter(([k]) => state.verification[k] === "verified").length;
  if (n === DOCS.length) return "";
  return `<a class="verify-banner" href="#verification">${icon("shield")}<div><b>${t("verification")} · ${n}/${DOCS.length} ${t("verifiedCount")}</b><small>${t("verificationSub")}</small><i><em style="width:${(n / DOCS.length) * 100}%"></em></i></div><span class="btn light">${t("completeProfile")}</span></a>`;
}
function nextTripCard(trip) {
  const load = tripLoad(trip);
  return `<section class="panel next-trip"><div class="section-heading"><div><span class="eyebrow-label">${t("nextTrip")}</span><h2>${esc(trip.from)} → ${esc(trip.to)}</h2><small class="muted">${dateText(trip.date)} · ${esc(trip.time)} · ${esc(trip.vehicleModel)}</small></div>${badge(trip.status)}</div>${capacityBars(trip)}<h3>${t("parcelsOnBoard")}</h3>${
    load.list.length
      ? `<ul class="onboard-list">${load.list
          .map(
            (r) =>
              `<li><a href="#request/${esc(r.id)}">${avatar(r.sender)}<span><b>${esc(r.sender)} → ${esc(r.recipient)}</b><small>${t(r.type)} · ${esc(r.weight)} kg · ${esc(r.content)}</small></span>${badge(r.status)}</a></li>`,
          )
          .join("")}</ul>`
      : `<p class="muted">${t("empty")}</p>`
  }<div class="detail-actions">${btn(t("allDetails") + icon("arrow", "flip"), "trip/" + trip.id, "")}</div></section>`;
}
function travelerSpace() {
  const trips = myTripsAll();
  const next = trips
    .filter((p) => ["upcoming", "inProgress"].includes(p.status))
    .sort((a, b) => (a.status === "inProgress" ? -1 : 0) - (b.status === "inProgress" ? -1 : 0) || String(a.date).localeCompare(String(b.date)))[0];
  const all = incomingAll();
  const waiting = all.filter((r) => r.status === "awaiting");
  const e = earningsSummary();
  return (
    spaceHero("traveler") +
    verificationBanner() +
    `<div class="kpi-grid">${kpi("wallet", money(e.thisMonth), t("kpiMonthEarnings"), "orange")}${kpi("clock", money(e.pending), t("kpiPendingEarnings"), "blue")}${kpi("bell", waiting.length, t("kpiRequests"), waiting.length ? "alert" : "")}${kpi("box", e.delivered.length, t("kpiCarried"), "green")}</div>` +
    `<div class="space-columns"><div>${next ? nextTripCard(next) : panel(`<p>${t("noTripYet")}</p>${btn(t("propose"), "publish", "")}`)}</div><div>${panel(
      `<div class="section-heading"><h2>${t("toHandle")}</h2><a class="text-link" href="#requests">${t("seeAll")} →</a></div>${waiting.length ? waiting.slice(0, 3).map(requestMini).join("") : `<p class="muted">${t("noRequests")}</p>`}`,
    )}${panel(
      `<div class="section-heading"><h2>${t("earnings")}</h2><a class="text-link" href="#earnings">${t("seeAll")} →</a></div><div class="earn-big"><small>${t("available")}</small><strong>${money(e.available)}</strong></div>${e.delivered
        .slice(0, 3)
        .map((r) => {
          const trip = reqTrip(r);
          return `<div class="payment-row"><span>${esc(trip.from || "")} → ${esc(trip.to || "")}<small class="block">${esc(r.sender)} · ${dateText(r.deliveredAt)}</small></span><strong class="positive">+ ${money(netOf(r.price))}</strong></div>`;
        })
        .join("")}`,
    )}</div></div>`
  );
}
function tripActions(trip) {
  return `${trip.status !== "completed" ? `<button class="btn" data-action="trip-advance" data-value="${esc(trip.id)}">${t(trip.status === "upcoming" ? "startTrip" : "finishTrip")}</button>` : ""}${trip.status === "upcoming" && state.published.some((p) => p.id === trip.id) ? `<button class="btn outline danger" data-action="delete-trip" data-value="${esc(trip.id)}">${t("delete")}</button>` : ""}`;
}
function tripCardMine(trip) {
  const load = tripLoad(trip);
  const waiting = incomingAll().filter((r) => r.tripId === trip.id && r.status === "awaiting").length;
  return `<article class="mytrip-card"><header><span class="box-icon">${icon("route")}</span><div><h3>${esc(trip.from)} → ${esc(trip.to)}</h3><small>${dateText(trip.date)} · ${esc(trip.time)} · ${esc(trip.vehicleModel)}</small></div>${badge(trip.status)}</header>${capacityBars(trip)}<div class="envoi-meta"><span>${icon("box")}${load.count} · ${t("parcelsOnBoard")}</span><span>${icon("bell")}${waiting} · ${t("toHandle")}</span><span>${icon("card")}${money(trip.price)} ${t("perParcel")}</span><strong>${money(netOf(load.gross))}</strong></div><footer>${btn(t("allDetails") + icon("arrow", "flip"), "trip/" + trip.id, "light")}${tripActions(trip)}</footer></article>`;
}
function myTrips() {
  const list = myTripsAll().filter((p) => p.status === tripTab);
  return (
    head("trips", t("travelerSpaceSub"), btn(icon("plus") + t("propose"), "publish", "")) +
    tabs(["upcoming", "inProgress", "completed"], tripTab, "trip-tab") +
    (list.length ? `<div class="trip-list">${list.map(tripCardMine).join("")}</div>` : empty(btn(t("propose"), "publish")))
  );
}
function tripPage() {
  const trip = getMyTrip(route.param);
  if (!trip) return head("myTrip") + empty(btn(t("trips"), "trips"));
  const load = tripLoad(trip);
  const waiting = incomingAll().filter((r) => r.tripId === trip.id && r.status === "awaiting");
  const progress = trip.status === "completed" ? 100 : trip.status === "inProgress" ? 50 : 0;
  return (
    head("myTrip", `${esc(trip.from)} → ${esc(trip.to)}`, badge(trip.status)) +
    `<div class="detail-grid">${infoCard(
      "route",
      "tripInfo",
      infoList([
        ["departureDate", dateText(trip.date) + " · " + esc(trip.time)],
        ["vehicle", esc(trip.vehicleModel)],
        ["capacity", `${esc(trip.seats)} · ${t("upTo")} ${esc(trip.weight)} kg ${t("perParcel")}`],
        ["price", `${money(trip.price)} ${t("perParcel")}`],
        ["pickup", esc(trip.pickup || trip.from)],
        ["dropoff", esc(trip.dropoff || trip.to)],
        ["notes", esc(trip.notes || "—")],
      ]) + `<div class="detail-actions">${tripActions(trip)}</div>`,
    )}${infoCard(
      "wallet",
      "earnings",
      capacityBars(trip) +
        infoList([
          ["gross", money(load.gross)],
          ["commission", "− " + money(round2(load.gross * COMMISSION))],
          ["net", `<strong>${money(netOf(load.gross))}</strong>`],
        ]),
    )}</div>` +
    panel(routeMap(trip.from, trip.to, progress)) +
    `<section class="trip-section"><h2>${t("parcelsOnBoard")} (${load.count})</h2>${load.list.length ? load.list.map(requestCard).join("") : panel(`<p class="muted">${t("empty")}</p>`)}</section>` +
    (waiting.length ? `<section class="trip-section"><h2>${t("toHandle")} (${waiting.length})</h2>${waiting.map(requestCard).join("")}</section>` : "") +
    localNote()
  );
}
let requestTab = "awaiting";
function requestsPage() {
  const groups = { awaiting: ["awaiting"], accepted: ["accepted", "pickedUp", "delivered"], declined: ["declined"] };
  const list = incomingAll().filter((r) => groups[requestTab].includes(r.status));
  return (
    head("requests", t("travelerSpaceSub")) +
    tabs(["awaiting", "accepted", "declined"], requestTab, "request-tab") +
    (list.length ? `<div class="req-list">${list.map(requestCard).join("")}</div>` : empty()) +
    localNote()
  );
}
function requestPage() {
  const r = getIncoming(route.param);
  if (!r) return head("requestDetail") + empty(btn(t("requests"), "requests"));
  const trip = reqTrip(r);
  return (
    head("requestDetail", `#${esc(r.id)}`, badge(r.status)) +
    requestCard(r) +
    (trip.from
      ? panel(`<h2>${icon("route")} ${esc(trip.from)} → ${esc(trip.to)}</h2>${googleMap({ from: trip.from, to: trip.to })}<div class="detail-actions">${btn(t("myTrip"), "trip/" + trip.id, "outline")}</div>`)
      : "")
  );
}
function earningsPage() {
  const e = earningsSummary();
  return (
    head("earnings", t("travelerSpaceSub")) +
    `<div class="kpi-grid">${kpi("wallet", money(e.total), t("totalEarned"), "orange")}${kpi("calendar", money(e.thisMonth), t("kpiMonthEarnings"), "blue")}${kpi("clock", money(e.pending), t("kpiPendingEarnings"))}${kpi("check", money(e.available), t("available"), "green")}</div>` +
    panel(
      `<div class="section-heading"><h2>${t("available")} : ${money(e.available)}</h2><button class="btn" data-action="withdraw" ${e.available <= 0 ? "disabled" : ""}>${icon("wallet")}${t("withdraw")}</button></div><p class="muted">${t("earningsNote")}</p>`,
    ) +
    panel(
      `<h2>${t("earningsHistory")}</h2>${
        e.delivered.length
          ? dataTable(
              [t("date"), t("routeLabel"), t("sender"), t("gross"), t("commission"), t("net")],
              e.delivered.map((r) => {
                const trip = reqTrip(r);
                return `<a class="dt-row" href="#request/${esc(r.id)}"><span data-label="${t("date")}">${dateText(r.deliveredAt)}</span><span data-label="${t("routeLabel")}">${esc(trip.from || "")} → ${esc(trip.to || "")}</span><span data-label="${t("sender")}">${esc(r.sender)}</span><span data-label="${t("gross")}">${money(r.price)}</span><span data-label="${t("commission")}">− ${money(round2(r.price * COMMISSION))}</span><span data-label="${t("net")}"><b class="positive">${money(netOf(r.price))}</b></span></a>`;
              }),
            )
          : `<p class="muted">${t("empty")}</p>`
      }`,
    ) +
    (state.payouts.length
      ? panel(`<h2>${t("payoutHistory")}</h2>${state.payouts.map((p) => `<div class="payment-row"><span>${dateText(p.date)} · #${esc(p.id)}</span><b>${money(p.amount)}</b></div>`).join("")}`)
      : "") +
    localNote()
  );
}
function verificationPage() {
  const v = state.verification;
  const label = (k) => (v[k] === "verified" ? "verified" : v[k] === "inReview" ? "inReview" : "missing");
  return (
    head("verification", t("verificationSub")) +
    verificationBanner() +
    panel(
      DOCS.map(
        ([k, name, i]) =>
          `<div class="doc-row"><span class="doc-icon">${icon(i)}</span><div><b>${t(name)}</b><small>${t(label(k))}</small></div><span class="badge doc-${label(k)}">${t(label(k))}</span>${label(k) === "missing" ? `<button class="btn outline" data-action="upload-doc" data-value="${k}">${icon("plus")}${t("upload")}</button>` : ""}</div>`,
      ).join(""),
    ) +
    `<p class="map-note">${t("uploadNote")}</p>`
  );
}
function spaceCards() {
  return `<div class="space-cards">${[
    ["sender", "space-sender", "box", "senderSpace", "senderSpaceSub"],
    ["traveler", "space-traveler", "car", "travelerSpace", "travelerSpaceSub"],
  ]
    .map(
      ([s, p, i, k, sub]) =>
        `<a class="space-card ${s} ${state.space === s ? "active" : ""}" href="#${p}">${icon(i)}<span><b>${t(k)}</b><small>${t(sub)}</small></span><span>›</span></a>`,
    )
    .join("")}</div>`;
}
function downloadReceipt(p) {
  const price = priceParts(p);
  const lines = [
    t("receiptTitle"),
    "========================",
    `#${p.id} · ${p.from} → ${p.to}`,
    `${t("date")}: ${dateText(p.date)}${p.time ? " " + p.time : ""}`,
    `${t("traveler")}: ${p.name}`,
    `${t("recipientLabel")}: ${p.recipient || "—"}`,
    `${t("type")}: ${t(p.type || "small")} · ${p.weight} kg`,
    "",
    `${t("transport")}: ${money(price.transport)}`,
    `${t("serviceFee")}: ${money(price.fee)}`,
    `${t("insurance")}: ${money(price.insurance)}`,
    `${t("total")}: ${money(price.total)}`,
    `${t("paymentMethod")}: ${t(p.payment || "card")}`,
    `${t("paymentStatus")}: ${t(payState(p.status))}`,
    "",
    t("demoNote"),
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `gotrajet-receipt-${p.id}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const pages = {
  welcome,
  onboarding,
  login: () => authPage("login"),
  register: () => authPage("register"),
  forgot,
  home,
  results,
  detail,
  checkout,
  success,
  send,
  parcels,
  parcel: parcelDetails,
  tracking,
  publish,
  trips: myTrips,
  traveler,
  messages: chat,
  notifications,
  profile,
  addresses,
  favorites,
  wallet,
  payments,
  reviews,
  review,
  "traveler-reviews": travelerReviews,
  settings,
  "notification-settings": notificationSettings,
  security,
  help,
  support: supportForm,
  report: supportForm,
  tickets,
  about,
  impact,
  terms: legal,
  privacy: legal,
  directory,
  "space-sender": senderSpace,
  "space-traveler": travelerSpace,
  trip: tripPage,
  requests: requestsPage,
  request: requestPage,
  earnings: earningsPage,
  verification: verificationPage,
};
const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
let revealObserver;
function updateSiteHeader() {
  $("#site-header")?.classList.toggle("scrolled", window.scrollY > 24);
}
function setupSite() {
  updateSiteHeader();
  shownTotal = calcTotal();
  document.documentElement.style.setProperty("--scroll", 0);
  document.documentElement.style.setProperty("--progress", 0);
  animateCounters();
  startDepartures();
  setupHeroVideo();
  revealObserver?.disconnect();
  if (reducedMotion() || !("IntersectionObserver" in window)) return;
  // Content is visible by default; elements entering the viewport get a short rise animation.
  revealObserver = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add("in");
        revealObserver.unobserve(el);
        // Once revealed, drop the helper classes so hover/tilt transforms apply.
        setTimeout(() => el.classList.remove("pending", "in"), 1500);
      }),
    { threshold: 0 },
  );
  const fold = window.innerHeight;
  $$(".site .reveal").forEach((el) => {
    if (el.getBoundingClientRect().top > fold) {
      el.classList.add("pending");
      revealObserver.observe(el);
    }
  });
}
/* Number tween used by the counters and the earnings calculator. */
function tween(from, to, duration, onStep) {
  if (reducedMotion()) return onStep(to);
  const start = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - k, 3);
    onStep(from + (to - from) * eased);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
let shownTotal = null;
function updateCalc() {
  const out = (sel, value) => {
    const el = $(sel);
    if (el) el.textContent = value;
  };
  out("#calc-parcels-out", calc.parcels);
  out("#calc-price-out", money(calc.price));
  const target = calcTotal();
  const from = shownTotal ?? target;
  shownTotal = target;
  tween(from, target, 450, (v) =>
    out("#calc-total", money(Math.round(v * 10) / 10)),
  );
  const total = $("#calc-total");
  if (total && !reducedMotion()) {
    total.classList.remove("bump");
    void total.offsetWidth;
    total.classList.add("bump");
  }
}
let siteTimers = [];
/* Hero background video: load -> travel -> deliver montage (Pexels licence).
   Skipped for reduced-motion and data-saver visitors (the photo stays),
   fades in only once it really plays, pauses off-screen and on request. */
let heroVideoPaused = false,
  heroVideoObserver;
function setupHeroVideo() {
  heroVideoObserver?.disconnect();
  const video = $("#hero-video");
  if (!video || reducedMotion() || navigator.connection?.saveData) return;
  const size = window.innerWidth < 760 ? "854" : "1280";
  video.innerHTML = ["webm", "mp4"]
    .map(
      (ext) =>
        `<source src="assets/video/hero-${size}.${ext}" type="video/${ext}">`,
    )
    .join("");
  video.muted = true;
  video.addEventListener(
    "playing",
    () => {
      video.parentElement.classList.add("is-playing");
      $(".site-hero")?.classList.add("has-video");
    },
    { once: true },
  );
  video.load();
  const play = () => {
    if (!heroVideoPaused) video.play().catch(() => {});
  };
  play();
  heroVideoObserver = new IntersectionObserver(([entry]) =>
    entry.isIntersecting ? play() : video.pause(),
  );
  heroVideoObserver.observe($(".site-hero"));
  syncVideoToggle();
}
function syncVideoToggle() {
  const button = $(".video-toggle");
  if (!button) return;
  const label = t(heroVideoPaused ? "playVideo" : "pauseVideo");
  button.setAttribute("aria-pressed", String(heroVideoPaused));
  button.setAttribute("aria-label", label);
  button.title = label;
  button.classList.toggle("paused", heroVideoPaused);
}
function animateCounters() {
  const counters = $$(".site-stats dt[data-count]");
  const run = (el) => {
    const to = Number(el.dataset.count),
      from = Number(el.dataset.from);
    tween(from, to, 1400, (v) => {
      el.textContent = new Intl.NumberFormat(locale()).format(Math.round(v));
    });
  };
  if (reducedMotion() || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) =>
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      run(entry.target);
      io.unobserve(entry.target);
    }),
  );
  counters.forEach((el) => {
    el.textContent = new Intl.NumberFormat(locale()).format(
      Number(el.dataset.from),
    );
    io.observe(el);
  });
}
function startDepartures() {
  if (reducedMotion()) return;
  let index = 0;
  siteTimers.push(
    setInterval(() => {
      const rows = $$(".departures-card li");
      if (!rows.length) return;
      rows[index % rows.length].classList.remove("active");
      index++;
      rows[index % rows.length].classList.add("active");
    }, 2600),
  );
}
/* Scroll-linked effects: header state, progress bar and parallax. */
let scrollTicking = false;
function onScrollEffects() {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    scrollTicking = false;
    updateSiteHeader();
    if (route.page !== "welcome") return;
    const max = document.documentElement.scrollHeight - innerHeight;
    const root = document.documentElement.style;
    root.setProperty("--progress", max > 0 ? (scrollY / max).toFixed(4) : 0);
    if (reducedMotion()) return;
    root.setProperty("--scroll", Math.round(scrollY));
    const travel = $("#travel");
    if (travel)
      travel.style.setProperty(
        "--t",
        Math.round(travel.getBoundingClientRect().top),
      );
  });
}
/* 3D tilt + spotlight that follows the pointer on cards (mouse only). */
let tiltEl = null;
function resetTilt(el) {
  if (!el) return;
  el.style.removeProperty("--rx");
  el.style.removeProperty("--ry");
  el.classList.remove("tilting");
}
document.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse" || reducedMotion()) return;
  const el = e.target.closest?.(".tilt, .site .route-card");
  if (el !== tiltEl) {
    resetTilt(tiltEl);
    tiltEl = el;
  }
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width,
    y = (e.clientY - r.top) / r.height;
  el.classList.add("tilting");
  el.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
  el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
  el.style.setProperty("--rx", ((0.5 - y) * 6).toFixed(2) + "deg");
  el.style.setProperty("--ry", ((x - 0.5) * 8).toFixed(2) + "deg");
});
document.addEventListener("pointerleave", () => {
  resetTilt(tiltEl);
  tiltEl = null;
});
function scrollToSection(sectionId) {
  const target =
    sectionId === "top" ? document.body : document.getElementById(sectionId);
  if (!target) return;
  document.body.classList.remove("menu-open");
  $(".site-burger")?.setAttribute("aria-expanded", "false");
  if (sectionId === "top")
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
  else
    target.scrollIntoView({
      behavior: reducedMotion() ? "auto" : "smooth",
      block: "start",
    });
}
window.addEventListener("scroll", onScrollEffects, { passive: true });
function setupPage() {
  setupMaps();
  if (route.page === "welcome") setupSite();
  if (route.page === "messages") {
    $(".chat-body").scrollTop = $(".chat-body").scrollHeight;
  }
  if (route.page === "checkout") {
    $('#checkout-form [name="quantity"]').addEventListener("change", (e) => {
      if (!e.target.checkValidity()) {
        e.target.reportValidity();
        return;
      }
      reservation.quantity = Number(e.target.value);
      render();
    });
    $('#checkout-form [name="insurance"]').addEventListener("change", (e) => {
      reservation.insurance = e.target.checked;
      render();
    });
  }
  if (route.page === "send" && draft.step === 3) {
    $('#parcel-form [name="date"]').addEventListener("change", (e) => {
      draft.date = e.target.value;
      draft.tripId = "";
      write("gj-draft", draft);
      render();
    });
  }
  if (route.page === "publish") {
    $("#publish-form").addEventListener("change", (e) => {
      if (!["from", "to"].includes(e.target.name)) return;
      const f = e.currentTarget;
      if (f.elements.from.value === f.elements.to.value) return;
      $("#publish-map").innerHTML = googleMap({
        from: f.elements.from.value,
        to: f.elements.to.value,
      });
    });
    $("#publish-form").addEventListener("input", (e) => {
      const f = e.currentTarget;
      $("#earnings").textContent = money(
        Number(f.elements.price.value) * Number(f.elements.seats.value) * 0.93,
      );
    });
  }
}
function transformMap(
  map,
  zoom = Number(map.dataset.zoom || 1),
  x = Number(map.dataset.x || 0),
  y = Number(map.dataset.y || 0),
) {
  map.dataset.zoom = Math.min(3, Math.max(1, zoom));
  map.dataset.x = Math.min(600, Math.max(-600, x));
  map.dataset.y = Math.min(200, Math.max(-200, y));
  map
    .querySelector(".map-layer")
    .setAttribute(
      "transform",
      `translate(${map.dataset.x} ${map.dataset.y}) translate(450 140) scale(${map.dataset.zoom}) translate(-450 -140)`,
    );
}
function setupMaps() {
  $$(".interactive-map").forEach((map) => {
    let drag = null;
    map.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      drag = {
        x: e.clientX,
        y: e.clientY,
        panX: Number(map.dataset.x || 0),
        panY: Number(map.dataset.y || 0),
      };
      map.setPointerCapture(e.pointerId);
    });
    map.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const rect = map.getBoundingClientRect();
      transformMap(
        map,
        undefined,
        drag.panX + ((e.clientX - drag.x) * 900) / rect.width,
        drag.panY + ((e.clientY - drag.y) * 280) / rect.height,
      );
    });
    const stop = () => (drag = null);
    map.addEventListener("pointerup", stop);
    map.addEventListener("pointercancel", stop);
    map.addEventListener("keydown", (e) => {
      if (e.target !== map) return;
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "+",
          "-",
          "0",
        ].includes(e.key)
      ) {
        e.preventDefault();
        const z = Number(map.dataset.zoom || 1),
          x = Number(map.dataset.x || 0),
          y = Number(map.dataset.y || 0);
        if (e.key === "0") transformMap(map, 1, 0, 0);
        else
          transformMap(
            map,
            e.key === "+" ? z + 0.25 : e.key === "-" ? z - 0.25 : z,
            x + (e.key === "ArrowRight" ? 30 : e.key === "ArrowLeft" ? -30 : 0),
            y + (e.key === "ArrowDown" ? 20 : e.key === "ArrowUp" ? -20 : 0),
          );
      }
    });
  });
}
function saveSearch() {
  const f = $("#search-form");
  if (f) {
    const d = Object.fromEntries(new FormData(f));
    search = { ...search, ...d };
  }
}
function addressModal(address = null) {
  modal(
    `<h2>${t(address ? "edit" : "addAddress")}</h2><form id="address-form" data-id="${esc(address?.id || "")}"><div class="form-grid">${field(t("addressLabel"), "label", address?.label || "", "text", 'required maxlength="80"')}${cityField(t("city"), "city", address?.city || "Casablanca")}${field(t("street"), "street", address?.street || "", "text", 'required maxlength="250"')}${field(t("phone"), "phone", address?.phone || "", "tel", 'maxlength="30"')}</div><label class="check-label"><input type="checkbox" name="default" ${address?.default ? "checked" : ""}>${t("defaultAddress")}</label><button class="btn wide">${t("save")}</button></form>`,
  );
}
function profileModal() {
  modal(
    `<h2>${t("editProfile")}</h2><form id="profile-form"><div class="form-grid">${field(t("name"), "name", state.profile.name, "text", 'required maxlength="80"')}${field(t("email"), "email", state.profile.email, "email", "required")}${field(t("phone"), "phone", state.profile.phone || "", "tel", 'maxlength="30"')}<label class="form-label">${t("profile")}<select name="role"><option value="individual" ${state.profile.role === "individual" ? "selected" : ""}>${t("individual")}</option><option value="carrier" ${state.profile.role === "carrier" ? "selected" : ""}>${t("carrier")}</option></select></label></div><button class="btn wide">${t("save")}</button></form>`,
  );
}
function filterModal() {
  modal(
    `<h2>${t("filters")}</h2><form id="filters-form"><div class="form-grid">${field(t("maxPrice"), "maxPrice", filters.maxPrice, "number", 'min="10" max="5000"')}<label class="form-label">${t("minRating")}<select name="minRating">${[0, 4, 4.5, 4.8, 4.9].map((n) => `<option value="${n}" ${Number(filters.minRating) === n ? "selected" : ""}>${n || t("all")}</option>`).join("")}</select></label>${field(t("minSeats"), "minSeats", filters.minSeats, "number", 'min="1" max="20" required')}</div><label class="check-label"><input type="checkbox" name="all" ${filters.all ? "checked" : ""}>${t("allRoutes")}</label><div class="detail-actions"><button class="btn">${t("apply")}</button><button type="button" class="btn outline" data-action="clear-filters">${t("clearFilters")}</button></div></form>`,
  );
}
function transaction(key, amount, ref = "") {
  state.transactions.unshift({ id: id("TX"), key, amount, ref, date: today() });
}
function confirmBooking(form) {
  const p = getTrip(form.dataset.trip);
  if (!p) return;
  const data = Object.fromEntries(new FormData(form)),
    qty = Number(data.quantity),
    weight = Number(data.weight),
    insured = form.elements.insurance.checked,
    payment = data.payment;
  if (
    !Number.isInteger(qty) ||
    qty < 1 ||
    qty > freeSeats(p) ||
    weight <= 0 ||
    weight > p.weight
  )
    return toast(t("badWeight"));
  const total = Number(p.price) * qty + (insured ? 10 * qty : 0);
  if (payment === "wallet" && total > state.balance)
    return toast(t("balance") + ": " + money(state.balance));
  if (payment === "wallet") {
    state.balance = Math.round((state.balance - total) * 100) / 100;
    transaction("reservation", -total, p.from + " → " + p.to);
  }
  const fromDraft = draft.tripId === p.id;
  const booking = {
    id: id("GJ"),
    tripId: p.id,
    from: p.from,
    to: p.to,
    name: p.name,
    date: p.date,
    time: p.time,
    weight,
    quantity: qty,
    price: total,
    payment,
    insurance: insured,
    status: "awaiting",
    createdAt: Date.now(),
    content: fromDraft ? draft.content : t(search.size),
    type: fromDraft ? draft.type : search.size,
    length: fromDraft ? draft.length : "",
    width: fromDraft ? draft.width : "",
    height: fromDraft ? draft.height : "",
    notes: fromDraft ? draft.notes : "",
    recipient: fromDraft ? draft.recipient : "",
    recipientPhone: fromDraft ? draft.phone : "",
    pickup: fromDraft ? draft.pickup : "",
    dropoff: fromDraft ? draft.dropoff : "",
    code: String(Math.floor(1000 + Math.random() * 9000)),
  };
  state.bookings.unshift(booking);
  notify("requestSent", p.from + " → " + p.to, "parcel/" + booking.id);
  persist();
  reservation = {
    quantity: 1,
    insurance: false,
    payment: state.defaultPayment || "card",
  };
  if (draft.tripId === p.id) {
    draft.step = 1;
    draft.tripId = "";
    write("gj-draft", draft);
  }
  go("success", booking.id);
  scheduleTravelerResponse();
}
function localDemoLogin(provider = "") {
  state.session = {
    demo: true,
    provider: provider || "email",
    at: new Date().toISOString(),
  };
  persist();
  go("home");
  toast(t("demo"));
}
function deleteConfirm(kind, value) {
  modal(
    `<h2>${t("delete")} ?</h2><p>${t("demoNote")}</p><div class="detail-actions"><button class="btn danger" data-action="confirm-delete" data-kind="${kind}" data-value="${esc(value)}">${t("delete")}</button><button class="btn outline" data-action="close">${t("cancel")}</button></div>`,
  );
}
const actions = {
  close: closeModal,
  "scroll-to": (el) => scrollToSection(el.dataset.value),
  "hero-video": () => {
    const video = $("#hero-video");
    if (!video) return;
    heroVideoPaused = !heroVideoPaused;
    if (heroVideoPaused) video.pause();
    else video.play().catch(() => {});
    syncVideoToggle();
  },
  "map-view": (el) => {
    mapView = el.dataset.value;
    const card = el.closest(".route-map");
    card.dataset.view = mapView;
    card.querySelectorAll("[data-action=map-view]").forEach((b) => {
      const active = b.dataset.value === mapView;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", String(active));
    });
    card
      .querySelectorAll(".map-pane")
      .forEach((pane) => (pane.hidden = pane.dataset.pane !== mapView));
  },
  "coverage-city": (el) => {
    coverageCity = el.dataset.value;
    $$(".city-chips button").forEach((b) => {
      const active = b.dataset.value === coverageCity;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    $("#coverage-map").innerHTML = googleMap(
      { q: mapPlace(coverageCity), zoom: 11 },
      "large",
    );
    search.from = coverageCity;
    if (search.to === coverageCity)
      search.to = CITIES.find((c) => c !== coverageCity);
    const form = $("#search-form");
    if (form) {
      form.elements.from.value = search.from;
      form.elements.to.value = search.to;
    }
  },
  "site-menu": (el) => {
    const open = document.body.classList.toggle("menu-open");
    el.setAttribute("aria-expanded", String(open));
  },
  "landing-role": (el) => {
    landingRole = el.dataset.value;
    $$(".role-switch [data-action=landing-role]").forEach((b) => {
      const active = b.dataset.value === landingRole;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", String(active));
    });
    $$(".how-panel").forEach((p) => {
      p.hidden = p.id !== "how-" + landingRole;
      p.querySelectorAll(".reveal").forEach((r) => r.classList.remove("pending"));
    });
  },
  "map-in": (el) => {
    const map = el.closest(".map");
    transformMap(map, Number(map.dataset.zoom || 1) + 0.25);
  },
  "map-out": (el) => {
    const map = el.closest(".map");
    transformMap(map, Number(map.dataset.zoom || 1) - 0.25);
  },
  "map-reset": (el) => transformMap(el.closest(".map"), 1, 0, 0),
  "onboard-dot": (el) => {
    onboardingIndex = Number(el.dataset.value);
    render();
  },
  "onboard-next": () => {
    if (onboardingIndex < 2) {
      onboardingIndex++;
      render();
    } else go("register");
  },
  "toggle-password": (el) => {
    const input = el.parentElement.querySelector("input");
    input.type = input.type === "password" ? "text" : "password";
  },
  social: (el) =>
    modal(
      `<h2>${esc(el.dataset.value)}</h2><p>${t("providerNote")}</p><button class="btn wide" data-action="social-demo" data-value="${esc(el.dataset.value)}">${t("providerDemo")}</button>`,
    ),
  "social-demo": (el) => localDemoLogin(el.dataset.value),
  logout: () =>
    modal(
      `<h2>${t("logoutTitle")}</h2><p>${t("logoutSub")}</p><button class="btn wide" data-action="confirm-logout">${t("logout")}</button>`,
    ),
  "confirm-logout": () => {
    state.session = null;
    persist();
    go("welcome");
  },
  "search-mode": (el) => {
    saveSearch();
    search.mode = el.dataset.value;
    render();
  },
  swap: () => {
    const f = $("#search-form");
    const old = f.elements.from.value;
    f.elements.from.value = f.elements.to.value;
    f.elements.to.value = old;
    saveSearch();
  },
  "all-routes": () => {
    filters.all = true;
    search.date = "";
    go("results");
  },
  filters: filterModal,
  "clear-filters": () => {
    filters = {
      maxPrice: "",
      minRating: 0,
      minSeats: 1,
      sort: "time",
      all: true,
    };
    search.date = "";
    closeModal();
    render();
  },
  favorite: (el) => {
    const tid = el.dataset.value;
    if (state.favorites.includes(tid))
      state.favorites = state.favorites.filter((x) => x !== tid);
    else state.favorites.push(tid);
    persist();
    render();
  },
  "category-start": (el) => {
    draft.type = ["autoParts", "food"].includes(el.dataset.value)
      ? "small"
      : el.dataset.value;
    draft.content = ["autoParts", "food"].includes(el.dataset.value)
      ? t(el.dataset.value)
      : draft.content;
    draft.step = 1;
    write("gj-draft", draft);
    go("send");
  },
  "parcel-type": (el) => {
    captureDraft($("#parcel-form"));
    draft.type = el.dataset.value;
    write("gj-draft", draft);
    render();
  },
  "parcel-back": () => {
    captureDraft($("#parcel-form"));
    if (draft.step > 1) {
      draft.step--;
      write("gj-draft", draft);
      render();
    } else go("home");
  },
  "pick-address": () =>
    modal(
      `<h2>${t("chooseAddress")}</h2>${state.addresses.map((a) => `<div class="setting"><span><b>${esc(a.label)}</b><small>${esc(a.street)} · ${esc(a.city)}</small></span><div><button class="text-link" data-action="use-address" data-value="${esc(a.id)}" data-for="pickup">${t("pickup")}</button><button class="text-link" data-action="use-address" data-value="${esc(a.id)}" data-for="dropoff">${t("dropoff")}</button></div></div>`).join("")}`,
    ),
  "use-address": (el) => {
    const a = state.addresses.find((a) => a.id === el.dataset.value);
    if (!a) return;
    captureDraft($("#parcel-form"));
    if (el.dataset.for === "pickup") {
      draft.pickup = a.street;
      draft.from = a.city;
    } else {
      draft.dropoff = a.street;
      draft.to = a.city;
      if (a.phone) draft.phone = a.phone;
    }
    write("gj-draft", draft);
    closeModal();
    render();
  },
  "parcel-tab": (el) => {
    parcelTab = el.dataset.value;
    render();
  },
  "request-search": (el) => {
    const p = state.requests.find((r) => r.id === el.dataset.value);
    search = { ...search, from: p.from, to: p.to, date: p.date };
    filters.all = false;
    go("results");
  },
  "trip-tab": (el) => {
    tripTab = el.dataset.value;
    render();
  },
  "trip-advance": (el) => {
    const trip = getMyTrip(el.dataset.value);
    if (!trip || trip.status === "completed") return;
    if (trip.status === "inProgress" && tripLoad(trip).list.some((r) => r.status !== "delivered"))
      return toast(t("finishParcelsFirst"));
    const next = trip.status === "upcoming" ? "inProgress" : "completed";
    changeTravel(state.published, trip.id, { status: next });
    tripTab = next;
    render();
  },
  "switch-space": (el) => {
    state.space = el.dataset.value === "traveler" ? "traveler" : "sender";
    persist();
    go(state.space === "traveler" ? "space-traveler" : "space-sender");
  },
  "request-tab": (el) => {
    requestTab = el.dataset.value;
    render();
  },
  "accept-request": (el) => {
    const r = getIncoming(el.dataset.value);
    if (!r || r.status !== "awaiting") return;
    const trip = reqTrip(r);
    if (tripLoad(trip).count >= Number(trip.seats) || Number(r.weight) > Number(trip.weight))
      return toast(t("capacityFull"));
    changeTravel(state.incoming, r.id, { status: "accepted", acceptedAt: new Date().toISOString() });
    toast(t("requestAcceptedT"));
    render();
  },
  "decline-request": (el) =>
    modal(
      `<h2>${t("declineConfirm")}</h2><div class="detail-actions"><button class="btn danger" data-action="confirm-decline" data-value="${esc(el.dataset.value)}">${t("decline")}</button><button class="btn outline" data-action="close">${t("cancel")}</button></div>`,
    ),
  "confirm-decline": (el) => {
    changeTravel(state.incoming, el.dataset.value, { status: "declined" });
    closeModal();
    toast(t("requestDeclinedT"));
    render();
  },
  "pickup-request": (el) => {
    changeTravel(state.incoming, el.dataset.value, { status: "pickedUp", pickedAt: new Date().toISOString() });
    toast(t("pickupConfirmed"));
    render();
  },
  "deliver-request": (el) => {
    const r = getIncoming(el.dataset.value);
    if (!r) return;
    modal(
      `<h2>${t("confirmDelivery")}</h2><p>${esc(r.sender)} → ${esc(r.recipient)} · #${esc(r.id)}</p><div class="notice">${t("codeHintDemo")}${esc(r.code)}</div><form id="request-handoff-form" data-id="${esc(r.id)}">${field(t("recipientCode"), "code", "", "text", 'required inputmode="numeric" pattern="[0-9]{4}" maxlength="4"')}<button class="btn wide">${t("confirmDelivery")}</button></form>`,
    );
  },
  withdraw: () => {
    const e = earningsSummary();
    if (e.available <= 0) return toast(t("empty"));
    state.payouts.unshift({ id: id("PO"), amount: e.available, date: today() });
    state.balance = round2(state.balance + e.available);
    transaction("payout", e.available);
    persist();
    toast(t("withdrawn") + money(e.available));
    render();
  },
  receipt: (el) => {
    const p = getParcel(el.dataset.value);
    if (p) downloadReceipt(p);
  },
  "upload-doc": (el) => {
    const doc = DOCS.find(([k]) => k === el.dataset.value);
    if (!doc) return;
    modal(
      `<h2>${t(doc[1])}</h2><form id="doc-form" data-doc="${esc(doc[0])}"><label class="form-label">${t("upload")}<input type="file" name="file" accept="image/*,.pdf" required></label><p class="map-note">${t("uploadNote")}</p><button class="btn wide">${t("upload")}</button></form>`,
    );
  },
  "delete-trip": (el) => deleteConfirm("trip", el.dataset.value),
  "cancel-booking": (el) =>
    modal(
      `<h2>${t("confirmCancel")}</h2><p>${t("cancelNote")}</p><button class="btn wide" data-action="confirm-cancel" data-value="${esc(el.dataset.value)}">${t("cancelBooking")}</button>`,
    ),
  "confirm-cancel": (el) => {
    const p = getParcel(el.dataset.value);
    if (!p || p.status === "cancelled") return;
    if (p.payment === "wallet") {
      state.balance = Math.round((state.balance + p.price) * 100) / 100;
      transaction("refund", p.price, p.id);
    }
    changeParcel(p.id, { status: "cancelled" });
    notify("cancelled", p.id, "parcel/" + p.id);
    closeModal();
    render();
  },
  handoff: (el) => {
    const p = getParcel(el.dataset.value);
    modal(
      `<h2>${t("confirmDelivery")}</h2><p>#${esc(p.id)} · ${esc(p.from)} → ${esc(p.to)}</p><div class="notice">${t("codeHint").replace("2048", p.code)}</div><form id="handoff-form" data-parcel="${esc(p.id)}">${field(t("code"), "code", "", "text", 'required inputmode="numeric" pattern="[0-9]{4}" maxlength="4"')}<button class="btn wide">${t("confirmDelivery")}</button></form>`,
    );
  },
  "contact-traveler": (el) => {
    activeChat = el.dataset.value;
    messageTab = "all";
    go("messages");
  },
  "message-tab": (el) => {
    messageTab = el.dataset.value;
    render();
  },
  "open-chat": (el) => {
    activeChat = el.dataset.value;
    state.notifications
      .filter((n) => n.key === "newMessage" && n.body === activeChat)
      .forEach((n) => (n.read = true));
    persist();
    render();
  },
  "notification-tab": (el) => {
    notificationTab = el.dataset.value;
    render();
  },
  "mark-all-read": () => {
    state.notifications.forEach((n) => (n.read = true));
    persist();
    render();
  },
  "read-notification": (el) => {
    const n = state.notifications.find((n) => n.id === el.dataset.value);
    n.read = true;
    persist();
    go(n.target);
  },
  "edit-profile": profileModal,
  "add-address": () => addressModal(),
  "edit-address": (el) =>
    addressModal(state.addresses.find((a) => a.id === el.dataset.value)),
  "delete-address": (el) => deleteConfirm("address", el.dataset.value),
  "default-address": (el) => {
    state.addresses.forEach((a) => (a.default = a.id === el.dataset.value));
    persist();
    render();
  },
  "confirm-delete": (el) => {
    const v = el.dataset.value;
    if (el.dataset.kind === "address") {
      state.addresses = state.addresses.filter((a) => a.id !== v);
      if (state.addresses.length && !state.addresses.some((a) => a.default))
        state.addresses[0].default = true;
    } else if (el.dataset.kind === "trip") {
      const used = state.bookings.some(
        (b) => b.tripId === v && b.status !== "cancelled",
      );
      if (used) {
        closeModal();
        toast(t("tripHasBookings"));
        return;
      }
      state.published = state.published.filter((p) => p.id !== v);
      state.favorites = state.favorites.filter((x) => x !== v);
      state.incoming = state.incoming.filter((r) => r.tripId !== v);
    } else if (el.dataset.kind === "card")
      state.cards = state.cards.filter((c) => c.id !== v);
    persist();
    closeModal();
    render();
  },
  topup: () =>
    modal(
      `<h2>${t("topup")}</h2><form id="topup-form">${field(t("amount"), "amount", 100, "number", 'required min="1" max="10000" step="0.01"')}<fieldset class="topup-methods"><legend>${t("topupMethod")}</legend><label class="payment-option"><input type="radio" name="method" value="card" checked>${icon("card")}<span>${t("card")}<small class="block">${t("topupNote")}</small></span></label>${CASH_NETWORKS.map((n) => `<label class="payment-option"><input type="radio" name="method" value="${esc(n)}">${icon("wallet")}<span>${esc(n)}<small class="block">${t("cashOption")}</small></span></label>`).join("")}</fieldset><button class="btn wide">${t("confirm")}</button></form>`,
    ),
  "cash-show": (el) => {
    const c = state.cashTopups.find((x) => x.id === el.dataset.value);
    if (c) modal(cashTopupView(c));
  },
  "cash-pay": (el) => {
    const c = state.cashTopups.find((x) => x.id === el.dataset.value);
    if (!c || cashStatus(c) !== "pending") return;
    c.status = "paid";
    c.paidAt = Date.now();
    state.balance = Math.round((state.balance + c.amount) * 100) / 100;
    transaction("topupCash", c.amount, `${c.network} · ${c.ref}`);
    notify("paymentConfirmed", `${money(c.amount)} · ${c.network}`, "wallet");
    persist();
    closeModal();
    render();
    toast(t("cashPaid"));
  },
  "cash-cancel": (el) => {
    const c = state.cashTopups.find((x) => x.id === el.dataset.value);
    if (!c || c.status !== "pending") return;
    c.status = "cancelled";
    persist();
    closeModal();
    render();
  },
  "add-card": () =>
    modal(
      `<h2>${t("addCard")}</h2><div class="notice">${t("cardNote")}</div><form id="card-form"><div class="form-grid">${field(t("cardholder"), "holder", "GOTRAJET TEST", "text", 'required maxlength="80"')}${field(t("last4"), "last4", "4242", "text", 'required inputmode="numeric" pattern="[0-9]{4}" maxlength="4"')}${field(t("expiry"), "expiry", "12/29", "text", 'required pattern="(0[1-9]|1[0-2])/[0-9]{2}" maxlength="5"')}</div><button class="btn wide">${t("save")}</button></form>`,
    ),
  "delete-card": (el) => deleteConfirm("card", el.dataset.value),
  "review-tab": (el) => {
    reviewTab = el.dataset.value;
    render();
  },
  star: (el) => {
    ratingValue = Number(el.dataset.value);
    $$(".star-picker button").forEach((b) => {
      b.classList.toggle("selected", Number(b.dataset.value) <= ratingValue);
      b.setAttribute(
        "aria-pressed",
        String(Number(b.dataset.value) <= ratingValue),
      );
    });
  },
  export: () => {
    const blob = new Blob(
        [
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              demo: true,
              state,
              sampleUpdates,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "gotrajet-demo-data.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  reset: () =>
    modal(
      `<h2>${t("resetData")}</h2><p>${t("resetConfirm")}</p><button class="btn danger wide" data-action="confirm-reset">${t("delete")}</button>`,
    ),
  "confirm-reset": () => {
    [
      "gj-v2",
      "gj-sample-updates",
      "gj-draft",
      "gj-profile",
      "gj-bookings",
      "gj-trips",
      "gj-messages",
      "gj-parcel",
      "gj-language",
    ].forEach((k) => localStorage.removeItem(k));
    location.href = location.pathname + "#welcome";
    location.reload();
  },
};
const submits = {
  "request-handoff-form": (form) => {
    const r = getIncoming(form.dataset.id);
    if (!r || new FormData(form).get("code") !== r.code) return toast(t("wrongCode"));
    changeTravel(state.incoming, r.id, { status: "delivered", deliveredAt: today() });
    closeModal();
    toast(t("earnedToast") + money(netOf(r.price)));
    render();
  },
  "doc-form": (form) => {
    const k = form.dataset.doc;
    state.verification[k] = "inReview";
    persist();
    closeModal();
    toast(t("docSubmitted"));
    render();
    setTimeout(() => {
      if (state.verification[k] !== "inReview") return;
      state.verification[k] = "verified";
      persist();
      toast(t("docApproved"));
      if (["verification", "space-traveler"].includes(route.page)) render();
    }, 3500);
  },
  "auth-form": (form) => {
    const data = Object.fromEntries(new FormData(form));
    if (data.password.length < 8) return;
    if (form.dataset.kind === "register") {
      if (!data.name.trim()) return;
      state.profile = {
        name: data.name.trim(),
        email: data.email,
        phone: data.phone,
        role: data.role,
      };
    } else state.profile.email = data.email;
    localDemoLogin();
  },
  "forgot-form": () =>
    modal(
      `<h2>${t("resetPassword")}</h2><p>${t("resetResult")}</p>${btn(t("login"), "login")}`,
    ),
  "search-form": (form) => {
    saveSearch();
    if (search.from === search.to) return toast(t("sameCity"));
    filters.all = false;
    if (search.mode === "travel") go("publish");
    else go("results");
  },
  "filters-form": (form) => {
    const d = Object.fromEntries(new FormData(form));
    filters = { ...filters, ...d, all: form.elements.all.checked };
    closeModal();
    render();
  },
  "checkout-form": confirmBooking,
  "parcel-form": (form) => {
    captureDraft(form);
    if (draft.step === 2 && draft.from === draft.to)
      return toast(t("sameCity"));
    if (draft.step < 4) {
      draft.step++;
      write("gj-draft", draft);
      render();
    } else if (draft.tripId) {
      reservation = {
        quantity: 1,
        insurance: false,
        payment: state.defaultPayment || "card",
      };
      go("checkout", draft.tripId);
    } else {
      const req = { ...draft, id: id("RQ"), status: "pending" };
      state.requests.unshift(req);
      persist();
      draft.step = 1;
      write("gj-draft", draft);
      go("success", req.id);
    }
  },
  "publish-form": (form) => {
    const d = Object.fromEntries(new FormData(form));
    if (d.from === d.to) return toast(t("sameCity"));
    if (new Date(d.date + "T" + d.time).getTime() <= Date.now())
      return toast(t("dateError"));
    const p = {
      ...d,
      id: id("TR"),
      price: Number(d.price),
      seats: Number(d.seats),
      weight: Number(d.weight),
      vehicle: d.vehicle,
      status: "upcoming",
    };
    state.published.unshift(p);
    state.incoming.unshift({
      id: id("RQ"),
      tripId: p.id,
      sender: "Amine K.",
      senderRating: 4.7,
      senderPhone: "+212 600 000 101",
      recipient: "Leïla S.",
      recipientPhone: "+212 600 000 109",
      type: "small",
      length: 30,
      width: 20,
      height: 15,
      weight: Math.min(3, p.weight),
      content: "Cadeau d’anniversaire",
      value: 250,
      notes: "",
      insurance: false,
      pickup: p.pickup || p.from + " · Centre",
      dropoff: p.dropoff || p.to + " · Centre",
      price: p.price,
      status: "awaiting",
      code: String(Math.floor(1000 + Math.random() * 9000)),
      receivedAt: new Date().toISOString(),
    });
    notify("newRequest", `Amine K. · ${p.from} → ${p.to}`, "requests");
    persist();
    tripTab = "upcoming";
    notify("tripAvailable", p.from + " → " + p.to, "detail/" + p.id);
    go("trips");
    toast(t("tripSaved"));
  },
  "handoff-form": (form) => {
    const p = getParcel(form.dataset.parcel),
      d = Object.fromEntries(new FormData(form));
    if (d.code !== p.code) return toast(t("wrongCode"));
    changeParcel(p.id, { status: "delivered" });
    notify("delivered", p.id, "parcel/" + p.id);
    closeModal();
    go("tracking", p.id);
    toast(t("deliveredSuccess"));
  },
  "chat-form": (form) => {
    const msg = new FormData(form).get("message").trim();
    if (!msg) return;
    state.messages[activeChat] ??= [];
    state.messages[activeChat].push({
      text: msg,
      at: new Date().toISOString(),
    });
    persist();
    render();
    $('#chat-form [name="message"]').focus();
  },
  "profile-form": (form) => {
    const d = Object.fromEntries(new FormData(form));
    if (!d.name.trim()) return;
    state.profile = { ...state.profile, ...d, name: d.name.trim() };
    persist();
    closeModal();
    render();
    toast(t("localSaved"));
  },
  "address-form": (form) => {
    const d = Object.fromEntries(new FormData(form)),
      aid = form.dataset.id || id("AD"),
      isDefault = form.elements.default.checked || !state.addresses.length;
    if (isDefault) state.addresses.forEach((a) => (a.default = false));
    const address = { ...d, id: aid, default: isDefault };
    const index = state.addresses.findIndex((a) => a.id === aid);
    if (index < 0) state.addresses.push(address);
    else state.addresses[index] = address;
    if (!state.addresses.some((a) => a.default))
      state.addresses[0].default = true;
    persist();
    closeModal();
    render();
    toast(t("localSaved"));
  },
  "topup-form": (form) => {
    const data = new FormData(form),
      amount = Number(data.get("amount")),
      network = data.get("method");
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) return;
    if (CASH_NETWORKS.includes(network)) {
      if (amount < CASH_MIN || amount > CASH_MAX) {
        toast(t("cashLimits"));
        return;
      }
      const c = {
        id: id("CT"),
        network,
        amount: Math.round(amount * 100) / 100,
        ref: cashReference(),
        status: "pending",
        created: Date.now(),
        expires: Date.now() + CASH_TTL_MS,
      };
      state.cashTopups.unshift(c);
      persist();
      render();
      modal(cashTopupView(c));
      return;
    }
    state.balance = Math.round((state.balance + amount) * 100) / 100;
    transaction("topup", amount);
    persist();
    closeModal();
    render();
    toast(t("topupNote"));
  },
  "card-form": (form) => {
    const d = Object.fromEntries(new FormData(form));
    if (!/^\d{4}$/.test(d.last4) || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(d.expiry))
      return;
    state.cards.push({ ...d, id: id("CD") });
    persist();
    closeModal();
    render();
    toast(t("localSaved"));
  },
  "default-payment-form": (form) => {
    state.defaultPayment = new FormData(form).get("method");
    reservation.payment = state.defaultPayment;
    persist();
    toast(t("localSaved"));
  },
  "review-form": (form) => {
    if (ratingValue < 1 || ratingValue > 5) return toast(t("chooseStars"));
    const p = getParcel(form.dataset.parcel),
      d = Object.fromEntries(new FormData(form));
    const r = {
      id: id("RV"),
      parcelId: p.id,
      name: p.name,
      rating: ratingValue,
      comment: d.comment.trim(),
      date: today(),
    };
    state.reviews = state.reviews.filter((r) => r.parcelId !== p.id);
    state.reviews.unshift(r);
    persist();
    ratingValue = 0;
    reviewTab = "given";
    go("reviews");
    toast(t("reviewSaved"));
  },
  "security-form": (form) => {
    const d = Object.fromEntries(new FormData(form));
    if (d.password.length < 8 || d.password !== d.confirmation)
      return toast(t("passwordMismatch"));
    form.reset();
    toast(t("passwordChecked"));
  },
  "support-form": (form) => {
    const d = Object.fromEntries(new FormData(form));
    state.tickets.unshift({
      ...d,
      id: id("SP"),
      type: route.page,
      date: today(),
    });
    persist();
    go("tickets");
    toast(t("supportSaved"));
  },
};
document.addEventListener("click", (event) => {
  const goEl = event.target.closest("[data-go]");
  if (goEl) {
    event.preventDefault();
    const [page, ...param] = goEl.dataset.go.split("/");
    go(page, param.join("/"));
    return;
  }
  const action = event.target.closest("[data-action]");
  if (action) {
    event.preventDefault();
    actions[action.dataset.action]?.(action);
  }
});
document.addEventListener("submit", (event) => {
  const fn = submits[event.target.id];
  if (fn) {
    event.preventDefault();
    if (!event.target.checkValidity()) {
      event.target.reportValidity();
      return;
    }
    fn(event.target);
  }
});
document.addEventListener("input", (event) => {
  const key = event.target.dataset?.calc;
  if (!key) return;
  calc[key] = Number(event.target.value);
  updateCalc();
});
window.addEventListener("beforeprint", () =>
  $$(".reveal.pending").forEach((el) => el.classList.add("in")),
);
document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches("[data-language]")) setLanguage(target.value);
  if (target.matches("[data-pref]")) {
    state.preferences[target.dataset.pref] = target.checked;
    persist();
    document.body.classList.toggle("dark", state.preferences.dark);
    toast(t("localSaved"));
  }
  if (target.id === "sort") {
    filters.sort = target.value;
    render();
  }
  if (target.matches('#checkout-form [name="payment"]'))
    reservation.payment = target.value;
});
$("#close-modal").addEventListener("click", closeModal);
$("#modal").addEventListener("click", (event) => {
  if (event.target === $("#modal")) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("menu-open")) {
    document.body.classList.remove("menu-open");
    $(".site-burger")?.setAttribute("aria-expanded", "false");
    $(".site-burger")?.focus();
  }
  if ($("#modal").hidden) return;
  if (event.key === "Escape") closeModal();
  if (event.key === "Tab") {
    const focusable = $$(
      "#modal button, #modal a, #modal input, #modal select, #modal textarea",
    ).filter((e) => !e.disabled);
    const first = focusable[0],
      last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
});
window.addEventListener("hashchange", () => {
  closeModal();
  if (route.page === "review") ratingValue = 0;
  render();
});
// With the backend, js/server.js loads the account first, then renders.
if (!window.GJ_SERVER) render();
