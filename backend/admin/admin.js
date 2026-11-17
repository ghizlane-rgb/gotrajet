/* GOTRAJET admin panel. Talks to /api/admin/* with the same session cookie as the website. */
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const mad = (n) => `${Number(n || 0).toLocaleString("fr-MA", { maximumFractionDigits: 2 })} MAD`;
const when = (iso) => (iso ? new Date(iso).toLocaleString("fr-MA", { dateStyle: "short", timeStyle: "short" }) : "—");
const badge = (s) => `<span class="badge ${esc(s)}">${esc(LABELS[s] || s)}</span>`;
const LABELS = {
  pending: "En attente", approved: "Approuvé", rejected: "Refusé", requested: "Demandé", paid: "Payé",
  open: "Ouvert", resolved: "Résolu", closed: "Fermé", active: "Actif", suspended: "Suspendu",
  awaiting: "En attente", accepted: "Accepté", picked_up: "En route", delivered: "Livré", declined: "Refusé",
  cancelled: "Annulé", expired: "Expiré", held: "Bloqué (séquestre)", frozen: "Gelé (litige)",
  released: "Versé au voyageur", refunded: "Remboursé", id: "Pièce d’identité", photo: "Selfie",
  license: "Permis", vehicle: "Carte grise", refund_sender: "Remboursement expéditeur",
  release_traveler: "Paiement voyageur", bank: "Virement", cash: "Espèces",
};
let tab = "overview";
let stats = {};

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: options.body ? { "Content-Type": "application/json" } : {},
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 403 && data.detail === "admin_2fa_required") {
    show2faSetup();
    throw new Error("auth");
  }
  if (res.status === 401 || res.status === 403) {
    showLogin(res.status === 403 ? (data.detail === "admin_ip_not_allowed" ? "Accès refusé depuis cette adresse IP." : "Ce compte n’a pas accès à l’administration.") : "");
    throw new Error("auth");
  }
  if (!res.ok) throw new Error(data.detail || res.statusText);
  return data;
}
function toast(msg) {
  $("#toast").textContent = msg;
  $("#toast").classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $("#toast").classList.remove("show"), 3000);
}
/* Cloudflare Turnstile on the login form, when the server has a site key */
let tsKey = "", tsWidget = null;
async function mountCaptcha() {
  try { tsKey = (await (await fetch("/api/health")).json()).turnstile || ""; } catch { tsKey = ""; }
  if (!tsKey || tsWidget !== null) return;
  const s = document.createElement("script");
  s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  s.onload = () => (tsWidget = window.turnstile.render("#captcha", { sitekey: tsKey }));
  document.head.appendChild(s);
}
const captchaToken = () => document.querySelector('#captcha [name="cf-turnstile-response"]')?.value || undefined;
const resetCaptcha = () => tsWidget !== null && window.turnstile?.reset(tsWidget);

/* First admin login in production: link an authenticator app (Google Authenticator, Microsoft Authenticator…) */
async function show2faSetup() {
  $("#login-view").hidden = true;
  $("#app-view").hidden = false;
  $("#tabs").hidden = true;
  $("#logout").hidden = false;
  let data;
  try {
    const res = await fetch("/api/admin/2fa/setup", { method: "POST", credentials: "same-origin" });
    data = await res.json();
    if (!res.ok) throw new Error(data.detail);
  } catch (e) {
    $("#panel").innerHTML = `<p class="error">Erreur : ${esc(e.message)}</p>`;
    return;
  }
  $("#panel").innerHTML = `<h2>Activer la double authentification</h2>
    <p>Pour protéger l’argent des utilisateurs, chaque compte admin doit utiliser une application d’authentification.</p>
    <ol><li>Installez <b>Google Authenticator</b> ou <b>Microsoft Authenticator</b> sur votre téléphone.</li>
    <li>Ajoutez un compte avec cette clé : <code style="user-select:all;font-size:16px">${esc(data.secret)}</code><br><small class="muted">ou ouvrez ce lien sur le téléphone : <a href="${esc(data.uri)}">${esc(data.uri)}</a></small></li>
    <li>Entrez le code à 6 chiffres affiché :</li></ol>
    <form id="enable-2fa" class="toolbar"><input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required placeholder="123456" autocomplete="one-time-code"><button>Activer</button></form>
    <p class="muted">Gardez cette clé en lieu sûr : sans le téléphone, seule une autre personne admin pourra vous aider.</p>`;
}

function showLogin(error = "") {
  mountCaptcha();
  $("#tabs").hidden = false;
  $("#login-view").hidden = false;
  $("#app-view").hidden = true;
  $("#logout").hidden = true;
  $("#who").textContent = "";
  $("#login-error").textContent = error;
}
async function start() {
  try {
    const { user } = await api("/api/me");
    if (!user.isAdmin) return showLogin("Ce compte n’a pas accès à l’administration.");
    $("#who").textContent = user.name;
    $("#logout").hidden = false;
    $("#login-view").hidden = true;
    $("#app-view").hidden = false;
    await refreshStats();
    show(tab);
  } catch (e) {
    if (e.message !== "auth") showLogin();
  }
}
async function refreshStats() {
  stats = await api("/api/admin/stats");
  document.querySelectorAll("[data-count]").forEach((b) => (b.textContent = stats[b.dataset.count] || ""));
  $("#mode").textContent = stats.sandbox ? "SANDBOX : paiements simulés" : "LIVE";
  $("#mode").classList.toggle("live", !stats.sandbox);
}
function table(head, rows, empty = "Rien à afficher.") {
  if (!rows.length) return `<p class="empty">${empty}</p>`;
  return `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}
const act = (label, action, id, cls = "", extra = "") =>
  `<button class="${cls}" data-act="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`;

const VIEWS = {
  async overview() {
    const s = stats, p = s.parcels || {};
    const k = (v, l) => `<div class="kpi"><strong>${v}</strong><small>${l}</small></div>`;
    return `<h2>Vue d’ensemble</h2><div class="kpis">${[
      k(s.users, "Utilisateurs"), k(s.verifiedTravelers, "Voyageurs vérifiés"), k(s.upcomingTrips, "Trajets à venir"),
      k((p.awaiting || 0) + (p.accepted || 0) + (p.picked_up || 0), "Colis en cours"), k(p.delivered || 0, "Colis livrés"),
      k(mad(s.escrowHeld), "Argent en séquestre"), k(mad(s.platformRevenue), "Revenu plateforme"),
      k(s.pendingDocs, "Documents à vérifier"), k(s.openDisputes, "Litiges ouverts"),
      k(`${s.requestedPayouts} · ${mad(s.requestedPayoutsAmount)}`, "Retraits à payer"),
      k(s.pendingCash, "Recharges espèces en attente"), k(s.openTickets, "Tickets support ouverts"),
    ].join("")}</div>`;
  },
  async docs() {
    const { docs } = await api("/api/admin/docs?status=" + (VIEWS.docFilter || "pending"));
    return `<h2>Vérification d’identité</h2><div class="toolbar"><select id="doc-filter">${["pending", "approved", "rejected", "all"].map((s) => `<option value="${s}" ${s === (VIEWS.docFilter || "pending") ? "selected" : ""}>${LABELS[s] || "Tous"}</option>`).join("")}</select><span class="muted">Comparez la pièce d’identité et le selfie avant d’approuver. Un voyageur peut publier quand son téléphone, sa pièce d’identité et son selfie sont validés.</span></div>` +
      table(["Utilisateur", "Document", "Téléphone", "Statut", "Envoyé", "Actions"], docs.map((d) =>
        `<tr><td><b>${esc(d.userName)}</b><small>${esc(d.userEmail)}</small></td><td>${badge(d.kind)}</td><td>${esc(d.phone)}<small>${d.phoneVerified ? "SMS vérifié" : "SMS non vérifié"}</small></td><td>${badge(d.status)}${d.note ? `<small>${esc(d.note)}</small>` : ""}</td><td>${when(d.createdAt)}</td><td class="actions">${act("Voir", "doc-view", d.id, "ghost", `data-type="${esc(d.contentType)}"`)}${d.status === "pending" ? act("Approuver", "doc-approve", d.id, "ok") + act("Refuser", "doc-reject", d.id, "danger") : ""}</td></tr>`), "Aucun document en attente.");
  },
  async disputes() {
    const { disputes } = await api("/api/admin/disputes");
    return `<h2>Litiges</h2><p class="muted">L’argent d’un colis en litige est gelé. Choisissez de rembourser l’expéditeur ou de payer le voyageur.</p>` +
      table(["Colis", "Ouvert par", "Motif", "Montant", "Statut", "Actions"], disputes.map((d) =>
        `<tr><td><b>#${esc(d.parcelId)}</b><small>${esc(d.route)}</small><small>${esc(d.sender)} → ${esc(d.traveler)}</small></td><td>${esc(d.openedBy)}<small>${when(d.createdAt)}</small></td><td>${esc(d.reason)}</td><td>${mad(d.amount)}<small>${badge(d.parcelStatus)} ${badge(d.escrow)}</small></td><td>${badge(d.status)}${d.resolution ? `<small>${esc(LABELS[d.resolution])}</small>` : ""}${d.adminNote ? `<small>${esc(d.adminNote)}</small>` : ""}</td><td class="actions">${d.status === "open" ? act("Rembourser l’expéditeur", "dispute-refund", d.id, "danger") + act("Payer le voyageur", "dispute-release", d.id, "ok") : ""}</td></tr>`), "Aucun litige.");
  },
  async payouts() {
    const { payouts } = await api("/api/admin/payouts");
    return `<h2>Retraits des voyageurs</h2><p class="muted">Faites le virement ou le paiement en agence, puis marquez « Payé ». « Refuser » recrédite le solde du voyageur.</p>` +
      table(["Voyageur", "Montant", "Mode", "Coordonnées", "Statut", "Actions"], payouts.map((p) =>
        `<tr><td><b>${esc(p.userName)}</b><small>${esc(p.phone)}</small><small>${when(p.createdAt)}</small></td><td><b>${mad(p.amount)}</b></td><td>${badge(p.method)}</td><td>${esc(p.details) || "—"}</td><td>${badge(p.status)}</td><td class="actions">${p.status === "requested" ? act("Marquer payé", "payout-paid", p.id, "ok") + act("Refuser", "payout-reject", p.id, "danger") : ""}</td></tr>`), "Aucune demande de retrait.");
  },
  async parcels() {
    const f = VIEWS.parcelFilter || "all";
    const { parcels } = await api("/api/admin/parcels?status=" + f);
    return `<h2>Colis</h2><div class="toolbar"><select id="parcel-filter">${["all", "awaiting", "accepted", "picked_up", "delivered", "declined", "cancelled"].map((s) => `<option value="${s}" ${s === f ? "selected" : ""}>${LABELS[s] || "Tous"}</option>`).join("")}</select></div>` +
      table(["Colis", "Trajet", "Expéditeur → Voyageur", "Prix", "Statut", "Argent"], parcels.map((p) =>
        `<tr><td><b>#${esc(p.id)}</b><small>${esc(p.content)} · ${esc(p.weight)} kg</small><small>${when(p.createdAt)}</small></td><td>${esc(p.from)} → ${esc(p.to)}<small>${esc(p.date)} ${esc(p.time)}</small></td><td>${esc(p.senderName)} → ${esc(p.travelerName)}<small>Destinataire : ${esc(p.recipient)} ${esc(p.recipientPhone)}</small></td><td>${mad(p.price)}<small>${esc(p.payment)}${p.insurance ? " · assuré" : ""}</small></td><td>${badge(p.rawStatus)}${p.dispute ? `<small>Litige : ${esc(LABELS[p.dispute.status])}</small>` : ""}</td><td>${badge(p.escrow)}</td></tr>`), "Aucun colis.");
  },
  async users() {
    const q = VIEWS.userQuery || "";
    const { users } = await api("/api/admin/users?q=" + encodeURIComponent(q));
    const v = (s) => ({ verified: "✓", inReview: "…", rejected: "✗", missing: "—" })[s] || "—";
    return `<h2>Utilisateurs</h2><form class="toolbar" id="user-search"><input name="q" value="${esc(q)}" placeholder="Nom, e-mail ou téléphone"><button>Rechercher</button></form>` +
      table(["Nom", "Contact", "Vérification (tél · CIN · selfie)", "Note", "Statut", "Actions"], users.map((u) =>
        `<tr><td><b>${esc(u.name)}</b>${u.isAdmin ? " <span class='badge'>admin</span>" : ""}<small>Inscrit ${when(u.createdAt)}</small></td><td>${esc(u.email)}<small>${esc(u.phone)}</small></td><td>${v(u.verification.phone)} · ${v(u.verification.id)} · ${v(u.verification.photo)}${u.verifiedTraveler ? "<small>Voyageur vérifié</small>" : ""}</td><td>${u.reviews ? `${u.rating} ★ (${u.reviews})` : "—"}</td><td>${badge(u.status)}</td><td class="actions">${u.isAdmin ? "" : u.status === "active" ? act("Suspendre", "user-suspend", u.id, "danger") : act("Réactiver", "user-activate", u.id, "ok")}</td></tr>`), "Aucun utilisateur.");
  },
  async cash() {
    const { topups } = await api("/api/admin/cash-topups");
    return `<h2>Recharges en espèces</h2><p class="muted">${stats.sandbox ? "Mode sandbox : les paiements sont simulés depuis l’application." : "Les paiements sont confirmés par le webhook signé de l’agence."}</p>` +
      table(["Utilisateur", "Réseau", "Référence", "Montant", "Statut", "Dates"], topups.map((c) =>
        `<tr><td>${esc(c.userName)}</td><td>${esc(c.network)}</td><td><code>${esc(c.ref)}</code>${c.agencyTxn ? `<small>Agence : ${esc(c.agencyTxn)}</small>` : ""}</td><td>${mad(c.amount)}</td><td>${badge(c.status)}</td><td>${when(new Date(c.created).toISOString())}<small>Expire ${when(new Date(c.expires).toISOString())}</small></td></tr>`), "Aucune recharge.");
  },
  async tickets() {
    const { tickets } = await api("/api/admin/tickets");
    return `<h2>Support</h2>` + table(["Utilisateur", "Sujet", "Message", "Statut", "Date", "Actions"], tickets.map((t) =>
      `<tr><td><b>${esc(t.userName)}</b><small>${esc(t.userEmail)}</small></td><td>${esc(t.topic)}<small>${esc(t.subject)}</small></td><td>${esc(t.message)}</td><td>${badge(t.status)}</td><td>${when(t.createdAt)}</td><td class="actions">${t.status === "open" ? act("Fermer", "ticket-close", t.id, "ghost") : ""}</td></tr>`), "Aucun ticket.");
  },
  async audit() {
    const { entries } = await api("/api/admin/audit");
    return `<h2>Journal des actions</h2>` + table(["Date", "Admin", "Action", "Cible", "Note"], entries.map((e) =>
      `<tr><td>${when(e.at)}</td><td>${esc(e.admin)}</td><td>${esc(e.action)}</td><td>${esc(e.target)}</td><td>${esc(e.detail)}</td></tr>`), "Aucune action enregistrée.");
  },
};

async function show(name) {
  tab = name;
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  $("#panel").innerHTML = `<p class="muted">Chargement…</p>`;
  try {
    $("#panel").innerHTML = await VIEWS[name]();
  } catch (e) {
    if (e.message !== "auth") $("#panel").innerHTML = `<p class="error">Erreur : ${esc(e.message)}</p>`;
  }
}

const ACTIONS = {
  "doc-view": (b) => {
    const url = `/api/admin/docs/${encodeURIComponent(b.dataset.id)}/file`;
    $("#viewer-body").innerHTML = b.dataset.type === "application/pdf" ? `<iframe src="${url}" title="Document"></iframe>` : `<img src="${url}" alt="Document d’identité">`;
    $("#viewer").showModal();
  },
  "doc-approve": (b) => post(`/api/admin/docs/${b.dataset.id}/approve`, {}, "Document approuvé"),
  "doc-reject": (b) => withNote("Motif du refus (envoyé à l’utilisateur) :", (note) => post(`/api/admin/docs/${b.dataset.id}/reject`, { note }, "Document refusé")),
  "dispute-refund": (b) => withNote("Note interne :", (note) => post(`/api/admin/disputes/${b.dataset.id}/resolve`, { resolution: "refund_sender", note }, "Expéditeur remboursé")),
  "dispute-release": (b) => withNote("Note interne :", (note) => post(`/api/admin/disputes/${b.dataset.id}/resolve`, { resolution: "release_traveler", note }, "Voyageur payé")),
  "payout-paid": (b) => withNote("Référence du virement / reçu agence :", (note) => post(`/api/admin/payouts/${b.dataset.id}/paid`, { note }, "Retrait marqué payé")),
  "payout-reject": (b) => withNote("Motif du refus :", (note) => post(`/api/admin/payouts/${b.dataset.id}/reject`, { note }, "Retrait refusé, solde recrédité")),
  "user-suspend": (b) => withNote("Motif de la suspension :", (note) => post(`/api/admin/users/${b.dataset.id}/suspend`, { note }, "Compte suspendu")),
  "user-activate": (b) => post(`/api/admin/users/${b.dataset.id}/activate`, {}, "Compte réactivé"),
  "ticket-close": (b) => post(`/api/admin/tickets/${b.dataset.id}/close`, {}, "Ticket fermé"),
};
function withNote(question, fn) {
  const note = window.prompt(question, "");
  if (note !== null) fn(note.trim());
}
async function post(path, body, done) {
  try {
    await api(path, { method: "POST", body });
    toast(done);
    await refreshStats();
    await show(tab);
  } catch (e) {
    if (e.message !== "auth") toast("Erreur : " + e.message);
  }
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-tab]");
  if (t) return show(t.dataset.tab);
  const a = e.target.closest("[data-act]");
  if (a) ACTIONS[a.dataset.act]?.(a);
});
document.addEventListener("change", (e) => {
  if (e.target.id === "doc-filter") { VIEWS.docFilter = e.target.value; show("docs"); }
  if (e.target.id === "parcel-filter") { VIEWS.parcelFilter = e.target.value; show("parcels"); }
});
document.addEventListener("submit", async (e) => {
  if (e.target.id === "user-search") {
    e.preventDefault();
    VIEWS.userQuery = new FormData(e.target).get("q");
    show("users");
  }
  if (e.target.id === "login") {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const body = { email: d.email, password: d.password, otp: d.otp || undefined, captcha: captchaToken() };
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))).detail;
      resetCaptcha();
      if (err === "otp_required") {
        $("#otp-row").hidden = false;
        $("#login [name=otp]").required = true;
        $("#login [name=otp]").focus();
        $("#login-error").textContent = "Entrez le code de votre application d’authentification.";
        return;
      }
      $("#login-error").textContent = {
        too_many_attempts: "Trop d’essais, réessayez dans 15 minutes.",
        wrong_otp: "Code de sécurité incorrect.",
        captcha_required: "Merci de valider la vérification anti-robot.",
        captcha_failed: "Vérification anti-robot échouée, réessayez.",
        account_suspended: "Compte suspendu.",
      }[err] || "E-mail ou mot de passe incorrect.";
      return;
    }
    $("#login").reset();
    $("#otp-row").hidden = true;
    start();
  }
  if (e.target.id === "enable-2fa") {
    e.preventDefault();
    const code = new FormData(e.target).get("code");
    const res = await fetch("/api/admin/2fa/enable", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    if (!res.ok) return toast("Code incorrect, réessayez avec le code actuel.");
    toast("Double authentification activée. Reconnectez-vous avec votre code.");
    showLogin("Double authentification activée : reconnectez-vous avec le code de l’application.");
  }
});
$("#logout").addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  showLogin();
});
setInterval(() => { if (!$("#app-view").hidden && document.visibilityState === "visible") refreshStats().catch(() => {}); }, 30000);
start();
