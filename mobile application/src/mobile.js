/* GOTRAJET mobile application layer.
   Loaded after the website's scripts (i18n.js → app.js → server.js). The screens, texts and
   data are the website's own; this file only adds what an app needs:
   - in the native app (Capacitor, Android / iOS): splash screen, status bar colours,
     the Android back button, external links in the system browser, file save/share;
   - in a browser: offline support (service worker) and an "install the app" prompt;
   - everywhere: a connection banner and safe-area handling (see mobile.css). */
(() => {
  const root = document.documentElement;
  root.classList.add("gj-app");
  const Cap = window.Capacitor;
  const native = !!Cap?.isNativePlatform?.();
  const P = (Cap && Cap.Plugins) || {};
  if (native) root.classList.add("gj-native", "gj-" + Cap.getPlatform());
  const standalone = native || matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  if (standalone) root.classList.add("gj-standalone");

  const WORDS = {
    offline: { fr: "Hors ligne — vos données restent sur l’appareil", en: "Offline — your data stays on this device", ar: "غير متصل — تبقى بياناتك على هذا الجهاز" },
    online: { fr: "Connexion rétablie", en: "Back online", ar: "تمت استعادة الاتصال" },
    installTitle: { fr: "Installer GOTRAJET", en: "Install GOTRAJET", ar: "ثبّت GOTRAJET" },
    installText: { fr: "L’application sur votre écran d’accueil, même hors ligne.", en: "The app on your home screen, even offline.", ar: "التطبيق على شاشتك الرئيسية، حتى دون اتصال." },
    install: { fr: "Installer", en: "Install", ar: "تثبيت" },
    exit: { fr: "Appuyez encore pour quitter", en: "Press back again to exit", ar: "اضغط مرة أخرى للخروج" },
    saved: { fr: "Fichier prêt à partager", en: "File ready to share", ar: "الملف جاهز للمشاركة" },
  };
  const say = (k) => {
    const lang = (root.lang || "fr").slice(0, 2);
    return WORDS[k][lang] || WORDS[k].fr;
  };
  const showToast = (msg) => (typeof window.toast === "function" ? window.toast(msg) : null);
  const page = () => location.hash.slice(1).split("/")[0] || "welcome";

  /* ---------- Connection banner ---------- */
  const net = document.createElement("div");
  net.className = "gj-net";
  net.setAttribute("role", "status");
  net.setAttribute("aria-live", "polite");
  document.body.appendChild(net);
  let netTimer;
  function connection(online) {
    clearTimeout(netTimer);
    net.textContent = say(online ? "online" : "offline");
    net.classList.toggle("online", online);
    net.classList.add("show");
    if (online) netTimer = setTimeout(() => net.classList.remove("show"), 2500);
  }
  addEventListener("offline", () => connection(false));
  addEventListener("online", () => connection(true));
  if (!navigator.onLine) connection(false);

  /* ---------- Browser: offline cache + install prompt ---------- */
  if (!native && "serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
  let installEvent = null;
  const DISMISS_KEY = "gj-install-dismissed";
  const dismissed = () => {
    try {
      return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < 14 * 864e5;
    } catch {
      return false;
    }
  };
  addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installEvent = event;
    if (!dismissed()) setTimeout(showInstall, 4000);
  });
  function showInstall() {
    if (!installEvent || document.querySelector(".gj-install")) return;
    const box = document.createElement("div");
    box.className = "gj-install";
    box.innerHTML = `<img src="assets/icon-192.png" alt=""><span><b>${say("installTitle")}</b>${say("installText")}</span><button type="button" class="gj-install-go">${say("install")}</button><button type="button" class="gj-install-close" aria-label="×">×</button>`;
    box.querySelector(".gj-install-go").onclick = async () => {
      box.remove();
      installEvent.prompt();
      await installEvent.userChoice.catch(() => {});
      installEvent = null;
    };
    box.querySelector(".gj-install-close").onclick = () => {
      box.remove();
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {}
    };
    document.body.appendChild(box);
  }
  addEventListener("appinstalled", () => document.querySelector(".gj-install")?.remove());

  if (!native) return;

  /* ---------- Native app (Capacitor) ---------- */
  const { App, Browser, SplashScreen, StatusBar, Filesystem, Share } = P;

  // Status bar follows the colour of the header on screen (navy site/auth screens, white or dark app screens).
  function luminance(color) {
    const m = color.match(/\d+(\.\d+)?/g);
    if (!m) return 1;
    const [r, g, b] = m.map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  function hex(color) {
    const m = color.match(/\d+/g);
    if (!m) return "#0b3052";
    return "#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  }
  function syncStatusBar() {
    if (!StatusBar) return;
    let bg = "rgb(11, 48, 82)";
    const site = document.body.classList.contains("site-view") || document.body.classList.contains("auth-view");
    const header = !site && document.querySelector(".topbar");
    if (header && header.offsetParent !== null) {
      const c = getComputedStyle(header).backgroundColor;
      if (c && !/rgba\(.*,\s*0\)/.test(c) && c !== "transparent") bg = c;
    }
    const light = luminance(bg) > 0.6;
    StatusBar.setStyle({ style: light ? "LIGHT" : "DARK" }).catch(() => {});
    StatusBar.setBackgroundColor?.({ color: hex(bg) }).catch(() => {});
  }
  new MutationObserver(() => requestAnimationFrame(syncStatusBar)).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  addEventListener("hashchange", () => requestAnimationFrame(syncStatusBar));

  // Hide the splash screen once the first screen is drawn.
  function ready() {
    syncStatusBar();
    setTimeout(() => SplashScreen?.hide({ fadeOutDuration: 250 }).catch(() => {}), 150);
  }
  if (document.readyState === "complete") ready();
  else addEventListener("load", ready);

  // Android back button: close what is open, otherwise go back; on the first screen, press twice to exit.
  let lastBack = 0;
  App?.addListener("backButton", () => {
    const modal = document.getElementById("modal");
    if (modal && !modal.hidden) {
      document.getElementById("close-modal")?.click();
      return;
    }
    if (document.body.classList.contains("menu-open")) {
      document.body.classList.remove("menu-open");
      document.querySelector(".site-burger")?.setAttribute("aria-expanded", "false");
      return;
    }
    const install = document.querySelector(".gj-install");
    if (install) return install.remove();
    if (!["welcome", "home"].includes(page()) && history.length > 1) {
      history.back();
      return;
    }
    if (page() !== "welcome" && page() !== "home") {
      location.hash = "#home";
      return;
    }
    if (Date.now() - lastBack < 2000) App.exitApp();
    else {
      lastBack = Date.now();
      showToast(say("exit"));
    }
  });

  // Links to other websites (Google Maps, etc.) open in the system browser, not inside the app.
  document.addEventListener(
    "click",
    (event) => {
      const a = event.target.closest?.("a[href]");
      if (!a || a.hasAttribute("download")) return;
      let url;
      try {
        url = new URL(a.getAttribute("href"), location.href);
      } catch {
        return;
      }
      if (!/^https?:$/.test(url.protocol) || url.origin === location.origin) return;
      event.preventDefault();
      if (Browser) Browser.open({ url: url.href }).catch(() => (location.href = url.href));
      else window.open(url.href, "_blank");
    },
    true,
  );

  // Downloads (receipt, data export): a WebView cannot save blob links, so write the file and open the share sheet.
  const blobs = new Map();
  const createObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (obj) => {
    const url = createObjectURL(obj);
    if (obj instanceof Blob) blobs.set(url, obj);
    return url;
  };
  const revokeObjectURL = URL.revokeObjectURL.bind(URL);
  URL.revokeObjectURL = (url) => {
    setTimeout(() => blobs.delete(url), 30000);
    revokeObjectURL(url);
  };
  const anchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    const blob = this.download && blobs.get(this.href);
    if (!blob || !Filesystem || !Share) return anchorClick.call(this);
    saveAndShare(blob, this.download);
  };
  async function saveAndShare(blob, name) {
    try {
      const text = await blob.text();
      const file = await Filesystem.writeFile({ path: name, data: text, directory: "CACHE", encoding: "utf8" });
      showToast(say("saved"));
      await Share.share({ title: name, files: [file.uri], dialogTitle: name });
    } catch (e) {
      if (!/cancel/i.test(String(e?.message || e))) console.warn("GOTRAJET share:", e);
    }
  }
})();
