/* GOTRAJET — smart helpers shared by the screens (loaded after i18n.js, before app.js).
   Everything here is computed from real inputs: the road network, the trips actually listed,
   and the text the sender types. Nothing is invented.
   - Road network: along-the-way matching, distance and travel-time estimates.
   - Prohibited-items check: warns or blocks while the sender describes the parcel.
   - Price guide: a distance-based range plus the median of trips listed on that route.
   - Trust badges: shown only when the server sends the facts (verified ID, delivery count). */

/* ---------- Road network (keep in sync with ROAD_LINKS in backend/app/services.py) ---------- */
const ROAD_LINKS = [
  ["Tanger", "Rabat", 250], ["Rabat", "Casablanca", 87], ["Casablanca", "Marrakech", 240],
  ["Marrakech", "Agadir", 250], ["Rabat", "Meknès", 140], ["Meknès", "Fès", 60],
  ["Fès", "Oujda", 340], ["Tanger", "Meknès", 290], ["Tanger", "Fès", 300],
];
const ROAD_CITIES = ["Casablanca", "Rabat", "Marrakech", "Agadir", "Fès", "Tanger", "Oujda", "Meknès"];
const _pathCache = {};
/* Shortest road path a → b: { path: [cities in order], km }. Empty path when unknown. */
function roadPath(a, b) {
  const key = a + "|" + b;
  if (_pathCache[key]) return _pathCache[key];
  const none = { path: [], km: 0 };
  if (a === b || !ROAD_CITIES.includes(a) || !ROAD_CITIES.includes(b)) return none;
  const graph = Object.fromEntries(ROAD_CITIES.map((c) => [c, []]));
  ROAD_LINKS.forEach(([x, y, km]) => {
    graph[x].push([y, km]);
    graph[y].push([x, km]);
  });
  const dist = { [a]: 0 },
    prev = {},
    todo = new Set(ROAD_CITIES);
  while (todo.size) {
    const city = [...todo].sort((p, q) => (dist[p] ?? 1e9) - (dist[q] ?? 1e9) || ROAD_CITIES.indexOf(p) - ROAD_CITIES.indexOf(q))[0];
    if ((dist[city] ?? 1e9) >= 1e9) break;
    todo.delete(city);
    graph[city].forEach(([next, km]) => {
      if (dist[city] + km < (dist[next] ?? 1e9)) {
        dist[next] = dist[city] + km;
        prev[next] = city;
      }
    });
  }
  if (dist[b] === undefined) return none;
  const path = [b];
  while (path[path.length - 1] !== a) path.push(prev[path[path.length - 1]]);
  return (_pathCache[key] = { path: path.reverse(), km: dist[b] });
}
/* "direct" when the trip is exactly a → b, "along" when it passes through a then b, else "". */
function tripServes(tripFrom, tripTo, a, b) {
  if (tripFrom === a && tripTo === b) return "direct";
  const { path } = roadPath(tripFrom, tripTo);
  const i = path.indexOf(a),
    j = path.indexOf(b);
  return i >= 0 && j >= 0 && i < j ? "along" : "";
}
const roadKm = (a, b) => roadPath(a, b).km;
/* Door-to-door driving estimate at an average 80 km/h, rounded to 5 minutes. */
function etaText(km) {
  if (!km) return "—";
  const minutes = Math.max(5, Math.round(((km / 80) * 60) / 5) * 5);
  const h = Math.floor(minutes / 60),
    m = minutes % 60;
  return "≈ " + (h ? `${h} h${m ? " " + String(m).padStart(2, "0") : ""}` : `${m} min`);
}

/* ---------- Price guide ---------- */
const round5 = (n) => Math.max(10, Math.round(n / 5) * 5);
/* Suggested range from the distance, and the median of the trips actually listed on that route. */
function priceAdvice(from, to, trips = []) {
  const km = roadKm(from, to);
  if (!km) return null;
  const centre = 25 + 0.22 * km;
  const listed = trips
    .filter((p) => p.from === from && p.to === to)
    .map((p) => Number(p.price))
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const mid = listed.length
    ? listed.length % 2
      ? listed[(listed.length - 1) / 2]
      : (listed[listed.length / 2 - 1] + listed[listed.length / 2]) / 2
    : null;
  return { km, low: round5(centre * 0.8), high: round5(centre * 1.2), suggested: round5(centre), median: mid, count: listed.length };
}

/* ---------- Prohibited-items check ----------
   Same categories as the "prohibitedList" rule shown at booking. Keywords in French, English,
   Arabic and common Darija spellings. "block" items cannot be sent; "caution" items can, with advice. */
const RISK_RULES = [
  ["cash", "block", ["argent liquide", "especes", "billets", "cash", "money", "flouss", "flous", "devises", "فلوس", "نقود", "أوراق نقدية"]],
  ["jewels", "block", ["bijou", "bijoux", "diamant", "diamond", "jewel", "jewels", "jewellery", "jewelry", "lingot", "ذهب", "مجوهرات", "حلي"]],
  ["weapons", "block", ["arme", "armes", "pistolet", "fusil", "munition", "munitions", "couteau", "couteaux", "poignard", "weapon", "weapons", "gun", "guns", "knife", "knives", "ammo", "ammunition", "سلاح", "أسلحة", "سكين", "ذخيرة"]],
  ["drugs", "block", ["drogue", "drogues", "cannabis", "haschich", "hashish", "chira", "kif", "cocaine", "drug", "drugs", "weed", "مخدرات", "حشيش", "كيف"]],
  ["medicine", "block", ["medicament", "medicaments", "ordonnance", "medicine", "medicines", "medication", "pills", "comprimes", "دواء", "أدوية", "وصفة"]],
  ["hazard", "block", ["essence", "gasoil", "carburant", "bouteille de gaz", "butane", "propane", "inflammable", "explosif", "explosifs", "petard", "petards", "feux d'artifice", "acide", "solvant", "gasoline", "petrol", "fuel", "explosive", "explosives", "fireworks", "flammable", "بنزين", "غاز", "بوطة", "متفجرات", "مفرقعات"]],
  ["animals", "block", ["animal", "animaux", "chien", "chiot", "chaton", "oiseau", "oiseaux", "poule", "lapin", "dog", "puppy", "kitten", "bird", "birds", "pet", "pets", "حيوان", "كلب", "قط", "طائر"]],
  ["perishable", "caution", ["viande", "poisson", "lait", "fromage", "gateau", "gateaux", "patisserie", "patisseries", "nourriture", "repas", "plat", "tajine", "couscous", "meat", "fish", "milk", "cheese", "cake", "cakes", "food", "meal", "لحم", "حوت", "سمك", "حليب", "حلويات", "طعام", "أكل"]],
  ["battery", "caution", ["batterie", "batteries", "lithium", "powerbank", "power bank", "telephone", "smartphone", "iphone", "ordinateur", "laptop", "tablette", "phone", "battery", "tablet", "هاتف", "بطارية", "حاسوب"]],
  ["fragile", "caution", ["verre", "vase", "miroir", "ceramique", "porcelaine", "fragile", "glass", "mirror", "ceramic", "porcelain", "زجاج", "مرآة", "خزف"]],
  ["perfume", "caution", ["parfum", "parfums", "aerosol", "spray", "deodorant", "perfume", "عطر", "عطور"]],
];
const _fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const _latin = /^[a-z0-9' ]+$/;
/* Returns { level: "block" | "caution" | "", hits: [{ key, level }] } for the typed description. */
function contentRisk(text) {
  const s = _fold(text);
  if (!s.trim()) return { level: "", hits: [] };
  const hits = RISK_RULES.filter(([, , words]) =>
    words.some((w) => {
      const word = _fold(w);
      if (!_latin.test(word)) return s.includes(word); // Arabic: no word boundaries in JS regex
      return new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(s);
    }),
  ).map(([key, level]) => ({ key, level }));
  return { level: hits.some((h) => h.level === "block") ? "block" : hits.length ? "caution" : "", hits };
}
function riskBox(text) {
  const r = contentRisk(text);
  if (!r.level) return text && text.trim().length > 2 ? `<div class="risk-box ok">${icon("check")}<span>${t("riskOk")}</span></div>` : "";
  return `<div class="risk-box ${r.level}" role="${r.level === "block" ? "alert" : "status"}">${icon(r.level === "block" ? "alert" : "shield")}<div><b>${t(r.level === "block" ? "riskBlockTitle" : "riskCautionTitle")}</b><ul>${r.hits.map((h) => `<li><b>${t("risk_" + h.key)}</b> · ${t("riskTip_" + h.key)}</li>`).join("")}</ul></div></div>`;
}
/* Live update of any [data-risk] description field: the result goes in the element named by data-risk. */
document.addEventListener("input", (e) => {
  const target = e.target.closest?.("[data-risk]");
  if (!target) return;
  const out = document.getElementById(target.dataset.risk);
  if (out) out.innerHTML = riskBox(target.value);
});

/* ---------- Trust and matching chips (only from data the server sends) ---------- */
function trustChips(trip) {
  const chips = [];
  if (trip.verified === true) chips.push(`<span class="chip chip-trust">${icon("shield")}${t("idVerified")}</span>`);
  if (typeof trip.deliveries === "number")
    chips.push(`<span class="chip">${icon("check")}${trip.deliveries ? `${trip.deliveries} ${t(trip.deliveries === 1 ? "deliveryDone" : "deliveriesDone")}` : t("newTraveler")}</span>`);
  return chips.length ? `<div class="chip-row">${chips.join("")}</div>` : "";
}
function matchChip(trip, from, to) {
  if (!from || !to || tripServes(trip.from, trip.to, from, to) !== "along") return "";
  return `<span class="chip chip-along" title="${esc(t("alongTip"))}">${icon("route")}${t("alongTheWay")} · ${esc(from)} → ${esc(to)}</span>`;
}
/* Keeps numbers + Latin units in reading order inside Arabic (RTL) text. Works in escaped text too. */
const ltr = (s) => "⁦" + s + "⁩";
function routeFacts(from, to) {
  const km = roadKm(from, to);
  return km ? ltr(`${new Intl.NumberFormat(locale()).format(km)} km · ${etaText(km)}`) : "—";
}
const moneyRange = (a, b) => ltr(`${money(a)} – ${money(b)}`);

/* ---------- Texts ---------- */
[
  ["riskOk", "Aucun objet interdit détecté dans la description.", "No prohibited item found in the description.", "لم يُرصد أي شيء ممنوع في الوصف."],
  ["riskBlockTitle", "Cet objet ne peut pas voyager avec GOTRAJET", "This item cannot travel with GOTRAJET", "لا يمكن نقل هذا الغرض عبر GOTRAJET"],
  ["riskCautionTitle", "Possible, avec quelques précautions", "Allowed, with a few precautions", "ممكن، مع بعض الاحتياطات"],
  ["riskBlocked", "Retirez l’objet interdit de la description pour continuer.", "Remove the prohibited item from the description to continue.", "احذف الغرض الممنوع من الوصف للمتابعة."],
  ["risk_cash", "Argent liquide", "Cash", "النقود"],
  ["risk_jewels", "Bijoux de valeur", "Valuable jewellery", "المجوهرات الثمينة"],
  ["risk_weapons", "Armes et couteaux", "Weapons and knives", "الأسلحة والسكاكين"],
  ["risk_drugs", "Drogues", "Drugs", "المخدرات"],
  ["risk_medicine", "Médicaments", "Medicines", "الأدوية"],
  ["risk_hazard", "Produits dangereux ou inflammables", "Dangerous or flammable goods", "المواد الخطرة أو القابلة للاشتعال"],
  ["risk_animals", "Animaux", "Animals", "الحيوانات"],
  ["risk_perishable", "Aliments", "Food", "الأطعمة"],
  ["risk_battery", "Appareils à batterie", "Battery devices", "الأجهزة ذات البطارية"],
  ["risk_fragile", "Objets fragiles", "Fragile items", "الأغراض القابلة للكسر"],
  ["risk_perfume", "Parfums et aérosols", "Perfume and aerosols", "العطور والبخاخات"],
  ["riskTip_cash", "utilisez un transfert d’argent (Cash Plus, Wafacash…).", "use a money transfer service (Cash Plus, Wafacash…).", "استعمل خدمة تحويل الأموال (كاش بلوس، وفاكاش…)."],
  ["riskTip_jewels", "trop risqué pour un transport entre particuliers.", "too risky for person-to-person transport.", "مخاطرة كبيرة في النقل بين الأفراد."],
  ["riskTip_weapons", "interdit par la loi et nos conditions.", "forbidden by law and our terms.", "ممنوع قانونياً وحسب شروطنا."],
  ["riskTip_drugs", "interdit par la loi et nos conditions.", "forbidden by law and our terms.", "ممنوع قانونياً وحسب شروطنا."],
  ["riskTip_medicine", "les médicaments, même sur ordonnance, ne sont pas acceptés.", "medicines, even on prescription, are not accepted.", "الأدوية، ولو بوصفة، غير مقبولة."],
  ["riskTip_hazard", "risque d’incendie dans le véhicule.", "fire risk in the vehicle.", "خطر الحريق داخل المركبة."],
  ["riskTip_animals", "les animaux ne voyagent pas comme colis.", "animals do not travel as parcels.", "الحيوانات لا تُنقل كطرود."],
  ["riskTip_perishable", "emballage hermétique, trajet court, précisez-le au voyageur.", "sealed packaging, short trip, tell the traveller.", "تغليف محكم ورحلة قصيرة، وأخبر المسافر."],
  ["riskTip_battery", "appareil éteint, déclarez sa valeur et ajoutez l’assurance.", "device switched off, declare its value and add insurance.", "أطفئ الجهاز وصرّح بقيمته وأضف التأمين."],
  ["riskTip_fragile", "emballage rembourré et mention « fragile » sur le colis.", "padded packaging and a “fragile” label.", "تغليف مبطن وعلامة «قابل للكسر»."],
  ["riskTip_perfume", "petites quantités, bouchon scotché, dans un sac fermé.", "small amounts, cap taped, in a closed bag.", "كميات صغيرة، غطاء مثبت، داخل كيس مغلق."],
  ["idVerified", "Identité vérifiée", "ID verified", "هوية موثقة"],
  ["deliveryDone", "livraison réussie", "successful delivery", "توصيل ناجح"],
  ["deliveriesDone", "livraisons réussies", "successful deliveries", "عمليات توصيل ناجحة"],
  ["newTraveler", "Nouveau voyageur", "New traveller", "مسافر جديد"],
  ["alongTheWay", "En chemin", "On the way", "في الطريق"],
  ["alongTip", "Ce trajet est plus long mais passe par vos deux villes : le voyageur récupère et livre en chemin.", "This trip is longer but passes through both your cities: the traveller picks up and delivers on the way.", "هذه الرحلة أطول لكنها تمر بمدينتيك: يستلم المسافر ويسلّم في الطريق."],
  ["alongCount", "dont {n} en chemin, sur des trajets plus longs", "including {n} on the way, on longer trips", "منها {n} في الطريق ضمن رحلات أطول"],
  ["distance", "Distance", "Distance", "المسافة"],
  ["routeFacts", "Distance et durée estimée", "Distance and estimated time", "المسافة والمدة التقديرية"],
  ["toolsEyebrow", "Avant d’envoyer", "Before you send", "قبل الإرسال"],
  ["toolsTitle", "Tout savoir en 10 secondes", "Know everything in 10 seconds", "اعرف كل شيء في 10 ثوانٍ"],
  ["toolsSub", "Vérifiez si votre objet peut voyager et combien coûte un trajet, avant même de créer un compte.", "Check whether your item can travel and what a trip costs, before you even create an account.", "تحقق مما إذا كان غرضك قابلاً للنقل وكم تكلف الرحلة، حتى قبل إنشاء حساب."],
  ["canISend", "Puis-je l’envoyer ?", "Can I send it?", "هل يمكنني إرساله؟"],
  ["canISendSub", "Décrivez votre colis, la vérification se fait pendant que vous écrivez.", "Describe your parcel; it is checked as you type.", "صف طردك، يتم التحقق أثناء الكتابة."],
  ["canISendPh", "Ex. : 2 boîtes de gâteaux, un chargeur de téléphone…", "E.g. 2 boxes of pastries, a phone charger…", "مثال: علبتا حلويات، شاحن هاتف…"],
  ["howMuch", "Combien ça coûte ?", "How much does it cost?", "كم يكلف ذلك؟"],
  ["howMuchSub", "Fourchette indicative selon la distance, et prix réels des trajets publiés.", "Guide range by distance, plus real prices of listed trips.", "نطاق تقريبي حسب المسافة، مع الأسعار الحقيقية للرحلات المنشورة."],
  ["fairRange", "Fourchette conseillée", "Suggested range", "النطاق المقترح"],
  ["marketMedian", "Prix médian des trajets publiés", "Median price of listed trips", "السعر الوسيط للرحلات المنشورة"],
  ["noMarketYet", "Aucun trajet publié sur cette route pour l’instant.", "No trip listed on this route yet.", "لا توجد رحلات منشورة على هذا الطريق حالياً."],
  ["tripsAvailable", "{n} trajet(s) disponible(s) maintenant", "{n} trip(s) available now", "{n} رحلة متاحة الآن"],
  ["seeTrips", "Voir les trajets", "See trips", "عرض الرحلات"],
  ["priceGuideNote", "Le prix final est fixé par chaque voyageur. Commission GOTRAJET : 7 %, incluse.", "Each traveller sets the final price. GOTRAJET fee: 7%, included.", "يحدد كل مسافر السعر النهائي. عمولة GOTRAJET: ‏7%، مشمولة."],
  ["useSuggested", "Utiliser", "Use", "استعمال"],
  ["priceHint", "Prix conseillé pour {km} km : {low}–{high}.", "Suggested price for {km} km: {low}–{high}.", "السعر المقترح لمسافة {km} كم: {low}–{high}."],
  ["priceHintMarket", "Médiane des {n} trajets publiés : {median}.", "Median of {n} listed trips: {median}.", "وسيط {n} رحلات منشورة: {median}."],
  ["navTools", "Tarifs et règles", "Prices & rules", "الأسعار والقواعد"],
  ["routeAlert", "Nouveau trajet pour votre alerte", "New trip for your alert", "رحلة جديدة لتنبيهك"],
  ["alertMe", "M’alerter sur ce trajet", "Alert me for this route", "نبّهني لهذا الطريق"],
  ["alertOn", "Alerte active", "Alert on", "التنبيه مفعل"],
  ["alertSaved", "Alerte créée : vous serez notifié dès qu’un voyageur publie ce trajet, ou un trajet plus long qui passe par vos villes.", "Alert created: you will be notified as soon as a traveller publishes this route, or a longer trip passing through your cities.", "تم إنشاء التنبيه: ستتوصل بإشعار فور نشر مسافر لهذا الطريق أو لرحلة أطول تمر بمدينتيك."],
  ["alertRemoved", "Alerte supprimée.", "Alert removed.", "تم حذف التنبيه."],
  ["myAlerts", "Mes alertes trajet", "My route alerts", "تنبيهات الطرق"],
  ["alertsSub", "Recevez une notification dès qu’un trajet correspond.", "Get notified as soon as a trip matches.", "توصل بإشعار فور توفر رحلة مطابقة."],
  ["alertNeedsAccount", "Connectez-vous pour créer une alerte.", "Sign in to create an alert.", "سجّل الدخول لإنشاء تنبيه."],
  ["noTripsYet", "Aucun trajet pour l’instant sur cette route.", "No trip on this route yet.", "لا توجد رحلات على هذا الطريق حالياً."],
  ["noTripsAlertSub", "Créez une alerte : vous serez prévenu dès qu’un voyageur la publie.", "Create an alert: you will be told as soon as a traveller publishes it.", "أنشئ تنبيهاً: سيتم إخبارك فور نشر مسافر لهذا الطريق."],
  ["err_too_many_alerts", "Maximum 10 alertes. Supprimez-en une pour en créer une autre.", "Maximum 10 alerts. Remove one to add another.", "الحد الأقصى 10 تنبيهات. احذف واحداً لإضافة آخر."],
  ["err_invalid_cities", "Choisissez deux villes différentes.", "Choose two different cities.", "اختر مدينتين مختلفتين."],
].forEach(([k, fr, en, ar]) => phrase(k, fr, en, ar));
const fill = (key, vars) => Object.entries(vars).reduce((s, [k, v]) => s.split("{" + k + "}").join(v), t(key));
