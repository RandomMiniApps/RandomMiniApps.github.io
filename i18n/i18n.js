/* Site languages.
   Add a language: append it here and add i18n/<code>.json.
   Add an app card line: add i18n/apps/<id>.json from that app's source
   catalogs, and a <p class="app-langs" data-app-langs="id"> on its card.
   Translate a page: add its path to TRANSLATED_PATHS and its visible English
   sentences to each language file under "strings".
   The language choice is stored in localStorage under "siteLang". It is not a cookie. */
(function () {
  var LANGUAGES = [
    { code: "en", label: "English", htmlLang: "en-GB" },
    { code: "es", label: "Español", htmlLang: "es" },
    { code: "pt", label: "Português", htmlLang: "pt-BR" },
    { code: "de", label: "Deutsch", htmlLang: "de" },
    { code: "fr", label: "Français", htmlLang: "fr" }
  ];

  var HREFLANGS = [
    { hreflang: "en-GB", code: "en" },
    { hreflang: "es", code: "es" },
    { hreflang: "pt-BR", code: "pt" },
    { hreflang: "de", code: "de" },
    { hreflang: "fr", code: "fr" },
    { hreflang: "x-default", code: "en" }
  ];

  var TRANSLATED_PATHS = {
    "/": true,
    "/index.html": true,
    "/scamlens/": true,
    "/scamlens/index.html": true,
    "/scamlens/privacy/": true,
    "/scamlens/privacy/index.html": true,
    "/scamlens/terms/": true,
    "/scamlens/terms/index.html": true,
    "/apps/dyslexia-reading-lens/": true,
    "/apps/dyslexia-reading-lens/index.html": true,
    "/dyslexia-reading-lens-privacy.html": true,
    "/dyslexia-reading-lens-terms.html": true
  };

  var LEGAL_PATHS = {
    "/scamlens/privacy/": true,
    "/scamlens/privacy/index.html": true,
    "/scamlens/terms/": true,
    "/scamlens/terms/index.html": true,
    "/dyslexia-reading-lens-privacy.html": true,
    "/dyslexia-reading-lens-terms.html": true
  };

  var appPacks = {};

  var originalText = new WeakMap();
  var originalAttrs = new WeakMap();
  var pack = null;
  var current = "en";

  function languageByCode(code) {
    for (var i = 0; i < LANGUAGES.length; i++) {
      if (LANGUAGES[i].code === code) return LANGUAGES[i];
    }
    return null;
  }

  function requestedLanguage() {
    var fromQuery = "";
    try {
      fromQuery = new URLSearchParams(location.search).get("lang") || "";
    } catch (e) {}
    if (languageByCode(fromQuery)) return fromQuery;
    if (fromQuery) return "en";
    var fromStore = "";
    try {
      fromStore = localStorage.getItem("siteLang") || "";
    } catch (e) {}
    if (languageByCode(fromStore)) return fromStore;
    return "en";
  }

  function ui(key) {
    var fallback = {
      language: "Language",
      banner: "This page is still in English. The homepage, ScamLens, and Dyslexia Reading Lens are available in this language. Other apps will be added as they ship in more languages.",
      appLanguages: "App languages",
      legalBefore: "This is a translation for convenience. If it differs from the",
      legalLink: "English version",
      legalAfter: ", the English version applies."
    };
    if (pack && pack._ui && pack._ui[key]) return pack._ui[key];
    return fallback[key];
  }

  function walk(node, fn) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      fn(node);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    var tag = node.tagName;
    if (tag === "SCRIPT" || tag === "STYLE") return;
    if (node.getAttribute && node.getAttribute("translate") === "no") return;
    var children = node.childNodes;
    for (var i = 0; i < children.length; i++) walk(children[i], fn);
  }

  function applyText(dict) {
    walk(document.body, function (node) {
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      var original = originalText.get(node);
      var trimmed = original.trim();
      if (!trimmed) return;
      var value = dict && dict[trimmed] ? dict[trimmed] : trimmed;
      var lead = original.match(/^\s*/)[0];
      var trail = original.match(/\s*$/)[0];
      if (node.nodeValue !== lead + value + trail) node.nodeValue = lead + value + trail;
    });

    var title = document.title;
    if (!document.documentElement.dataset.i18nTitle) {
      document.documentElement.dataset.i18nTitle = title;
    }
    var originalTitle = document.documentElement.dataset.i18nTitle;
    document.title = dict && dict[originalTitle] ? dict[originalTitle] : originalTitle;

    var meta = document.querySelector('meta[name="description"]');
    if (meta) {
      if (!meta.dataset.i18nContent) meta.dataset.i18nContent = meta.getAttribute("content") || "";
      var originalMeta = meta.dataset.i18nContent;
      meta.setAttribute("content", dict && dict[originalMeta] ? dict[originalMeta] : originalMeta);
    }

    var attrs = ["alt", "aria-label"];
    var nodes = document.body.querySelectorAll("[alt], [aria-label]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!originalAttrs.has(el)) {
        originalAttrs.set(el, {
          alt: el.getAttribute("alt"),
          "aria-label": el.getAttribute("aria-label")
        });
      }
      var saved = originalAttrs.get(el);
      for (var a = 0; a < attrs.length; a++) {
        var name = attrs[a];
        var source = saved[name];
        if (!source) continue;
        el.setAttribute(name, dict && dict[source] ? dict[source] : source);
      }
    }
  }

  function labelFor(entry) {
    var labels = entry && entry.label ? entry.label : {};
    return labels[current] || labels.en || entry.code;
  }

  function fillAppLanguages() {
    var nodes = document.querySelectorAll("[data-app-langs]");
    for (var i = 0; i < nodes.length; i++) {
      var id = nodes[i].getAttribute("data-app-langs");
      var app = appPacks[id];
      var locales = app && app.card && app.card.locales;
      if (!locales || !locales.length) {
        nodes[i].textContent = "";
        continue;
      }
      var names = [];
      for (var c = 0; c < locales.length; c++) names.push(labelFor(locales[c]));
      var line = ui("appLanguages") + ": " + names.join(" · ");
      if (app.card.moreComing && app.card.moreComingLabel) {
        var more = app.card.moreComingLabel[current] || app.card.moreComingLabel.en;
        if (more) line += " · " + more;
      }
      nodes[i].textContent = line;
    }
  }

  function loadAppPacks() {
    var nodes = document.querySelectorAll("[data-app-langs]");
    var jobs = [];
    for (var i = 0; i < nodes.length; i++) {
      var id = nodes[i].getAttribute("data-app-langs");
      if (!id || appPacks[id]) continue;
      jobs.push(
        fetch("/i18n/apps/" + id + ".json")
          .then(function (response) {
            if (!response.ok) throw new Error("missing app languages");
            return response.json();
          })
          .then(function (json) {
            if (json && json.id) appPacks[json.id] = json;
          })
          .catch(function () {})
      );
    }
    return Promise.all(jobs);
  }

  function canonicalBase() {
    var link = document.querySelector('link[rel="canonical"]');
    if (link && link.href) return link.href.split("?")[0];
    var path = location.pathname;
    if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length);
    return location.origin + path;
  }

  function languageUrl(code) {
    var base = canonicalBase();
    if (!code || code === "en") return base;
    return base + "?lang=" + code;
  }

  function applyLanguageLinks(lang) {
    var base = canonicalBase();
    var canon = document.querySelector('link[rel="canonical"]');
    if (!canon) {
      canon = document.createElement("link");
      canon.rel = "canonical";
      document.head.appendChild(canon);
    }
    canon.href = lang === "en" ? base : base + "?lang=" + lang;
    for (var i = 0; i < HREFLANGS.length; i++) {
      var item = HREFLANGS[i];
      var alt = document.querySelector('link[rel="alternate"][hreflang="' + item.hreflang + '"]');
      if (!alt) {
        alt = document.createElement("link");
        alt.rel = "alternate";
        alt.hreflang = item.hreflang;
        document.head.appendChild(alt);
      }
      alt.href = languageUrl(item.code);
    }
  }

  function mountSwitcher() {
    var existing = document.querySelector(".lang-switch");
    if (existing) existing.remove();
    var wrap = document.createElement("div");
    wrap.className = "lang-switch";
    var label = document.createElement("label");
    var hidden = document.createElement("span");
    hidden.className = "visually-hidden";
    hidden.textContent = ui("language");
    hidden.style.position = "absolute";
    hidden.style.width = "1px";
    hidden.style.height = "1px";
    hidden.style.overflow = "hidden";
    hidden.style.clip = "rect(0 0 0 0)";
    var select = document.createElement("select");
    select.setAttribute("aria-label", ui("language"));
    for (var i = 0; i < LANGUAGES.length; i++) {
      var option = document.createElement("option");
      option.value = LANGUAGES[i].code;
      option.textContent = LANGUAGES[i].label;
      if (LANGUAGES[i].code === current) option.selected = true;
      select.appendChild(option);
    }
    select.addEventListener("change", function () {
      setLanguage(select.value, true);
    });
    label.appendChild(hidden);
    label.appendChild(select);
    wrap.appendChild(label);
    document.body.appendChild(wrap);
  }

  function mountLegalNotice() {
    var old = document.querySelector(".legal-notice");
    if (old) old.remove();
    if (current === "en" || !LEGAL_PATHS[location.pathname]) return;
    var notice = document.createElement("p");
    notice.className = "legal-notice";
    notice.appendChild(document.createTextNode(ui("legalBefore") + " "));
    var link = document.createElement("a");
    link.href = languageUrl("en");
    link.textContent = ui("legalLink");
    notice.appendChild(link);
    notice.appendChild(document.createTextNode(ui("legalAfter")));
    var page = document.querySelector(".page") || document.body;
    page.insertBefore(notice, page.firstChild);
  }

  function mountBanner() {
    var old = document.querySelector(".i18n-banner");
    if (old) old.remove();
    if (current === "en") return;
    var path = location.pathname;
    if (TRANSLATED_PATHS[path]) return;
    var banner = document.createElement("p");
    banner.className = "i18n-banner";
    banner.textContent = ui("banner");
    var page = document.querySelector(".page") || document.body;
    page.insertBefore(banner, page.firstChild);
  }

  function isTranslatedPage() {
    return !!TRANSLATED_PATHS[location.pathname];
  }

  function apply(lang) {
    current = lang;
    var chosen = languageByCode(lang) || LANGUAGES[0];
    document.documentElement.lang = chosen.htmlLang;
    document.documentElement.dir = "ltr";
    var dict = lang !== "en" && isTranslatedPage() && pack && pack.strings ? pack.strings : null;
    applyText(dict);
    fillAppLanguages();
    mountSwitcher();
    mountLegalNotice();
    mountBanner();
    applyLanguageLinks(lang);
    document.documentElement.classList.add("i18n-ready");
    document.documentElement.removeAttribute("data-pending-lang");
  }

  function setLanguage(lang, updateUrl) {
    if (!languageByCode(lang)) lang = "en";
    try {
      localStorage.setItem("siteLang", lang);
    } catch (e) {}
    if (updateUrl) {
      var url = new URL(location.href);
      if (lang === "en") url.searchParams.delete("lang");
      else url.searchParams.set("lang", lang);
      history.replaceState(null, "", url);
    }
    if (lang === "en") {
      pack = null;
      apply("en");
      return;
    }
    fetch("/i18n/" + lang + ".json")
      .then(function (response) {
        if (!response.ok) throw new Error("missing language");
        return response.json();
      })
      .then(function (json) {
        pack = json;
        apply(lang);
      })
      .catch(function () {
        pack = null;
        apply("en");
      });
  }

  document.addEventListener("click", function (event) {
    if (current === "en") return;
    var node = event.target;
    while (node && node.tagName !== "A") node = node.parentNode;
    if (!node || !node.getAttribute("href")) return;
    if (node.getAttribute("href").indexOf("mailto:") === 0) return;
    var url;
    try {
      url = new URL(node.href, location.href);
    } catch (e) {
      return;
    }
    if (url.origin !== location.origin) return;
    if (url.searchParams.get("lang") === current) return;
    url.searchParams.set("lang", current);
    node.href = url.pathname + url.search + url.hash;
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    var lang = requestedLanguage();
    loadAppPacks().then(function () {
      setLanguage(lang, false);
    });
  });
})();
