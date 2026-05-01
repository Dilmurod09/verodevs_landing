/**
 * Verodevs landing: смена языка и отправка формы на webhook (placeholder URL).
 */
(function () {
  const CONFIG = {
    /** Замените на реальный endpoint (n8n, Make, свой backend и т.д.) */
    WEBHOOK_URL: "https://example.com/your-webhook-placeholder",
  };

  /** Пока URL-заглушка — имитируем успех, чтобы локально проверить UI без CORS/404 */
  function isPlaceholderWebhook(url) {
    return /example\.com/i.test(url) || url.indexOf("placeholder") !== -1;
  }

  const STORAGE_KEY = "verodevs_lang";
  const THEME_KEY = "verodevs_theme";

  function getStoredLang() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "ru" || v === "en" || v === "uz") return v;
    } catch (_) {
      /* private mode и т.п. */
    }
    return null;
  }

  function setStoredLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {}
  }

  /** Подпись кнопки темы зависит от текущей темы и языка. */
  function updateThemeToggle() {
    const btn = document.getElementById("theme-toggle");
    if (!btn || !window.VerodevsI18n) return;
    const theme =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";
    const lang = getStoredLang() || VerodevsI18n.DEFAULT_LANG;
    const pack = VerodevsI18n.getStrings(lang);
    btn.setAttribute(
      "aria-label",
      theme === "dark" ? pack.themeAriaToLight : pack.themeAriaToDark
    );
    btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
  }

  function getStoredTheme() {
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (v === "light" || v === "dark") return v;
    } catch (_) {}
    return null;
  }

  function initTheme() {
    const initial = getStoredTheme() || "light";
    document.documentElement.setAttribute("data-theme", initial);

    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", function () {
        const cur =
          document.documentElement.getAttribute("data-theme") === "light"
            ? "light"
            : "dark";
        const next = cur === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch (_) {}
        updateThemeToggle();
      });
    }
  }

  function applyTranslations(lang) {
    const pack =
      window.VerodevsI18n && window.VerodevsI18n.getStrings
        ? window.VerodevsI18n.getStrings(lang)
        : {};

    document.documentElement.lang = lang === "uz" ? "uz" : lang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const key = el.getAttribute("data-i18n");
      if (!key || pack[key] == null) return;
      el.textContent = pack[key];
    });
    updateThemeToggle();
  }

  function setActiveLangButton(lang) {
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      const is = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", is);
      btn.setAttribute("aria-pressed", is ? "true" : "false");
    });
  }

  function initLang() {
    const initial = getStoredLang() || VerodevsI18n.DEFAULT_LANG;
    applyTranslations(initial);
    setActiveLangButton(initial);

    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const lang = btn.getAttribute("data-lang");
        if (!lang) return;
        setStoredLang(lang);
        applyTranslations(lang);
        setActiveLangButton(lang);
      });
    });
  }

  /**
   * POST JSON на webhook. Структура удобна для Zapier/n8n/своего API.
   * При смене CONFIG.WEBHOOK_URL ничего больше менять не нужно.
   */
  async function submitLead(payload) {
    if (isPlaceholderWebhook(CONFIG.WEBHOOK_URL)) {
      if (typeof console !== "undefined" && console.info) {
        console.info("[Verodevs] Placeholder webhook — payload (скопируйте для теста):", payload);
      }
      await new Promise(function (r) {
        setTimeout(r, 600);
      });
      return { ok: true, placeholder: true };
    }

    const res = await fetch(CONFIG.WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = new Error("Webhook responded with " + res.status);
      err.status = res.status;
      throw err;
    }
    return res;
  }

  function getFormMessages() {
    const lang = getStoredLang() || VerodevsI18n.DEFAULT_LANG;
    return VerodevsI18n.getStrings(lang);
  }

  function initForm() {
    const form = document.getElementById("lead-form");
    const statusEl = document.getElementById("form-status");
    if (!form || !statusEl) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const msgs = getFormMessages();
      statusEl.textContent = "";
      statusEl.classList.remove("is-error", "is-ok");

      const fd = new FormData(form);
      const name = String(fd.get("name") || "").trim();
      const phone = String(fd.get("phone") || "").trim();
      const message = String(fd.get("message") || "").trim();

      if (!name || !phone || !message) {
        statusEl.textContent = msgs.formValidate;
        statusEl.classList.add("is-error");
        return;
      }

      const payload = {
        source: "verodevs-landing",
        name: name,
        phone: phone,
        message: message,
        lang: getStoredLang() || VerodevsI18n.DEFAULT_LANG,
        sentAt: new Date().toISOString(),
      };

      statusEl.textContent = msgs.formSending;

      try {
        await submitLead(payload);
        statusEl.textContent = msgs.formOk;
        statusEl.classList.add("is-ok");
        form.reset();
      } catch (err) {
        statusEl.textContent = msgs.formErr;
        statusEl.classList.add("is-error");
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[Verodevs] Webhook error:", err);
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initTheme();
      initLang();
      initForm();
    });
  } else {
    initTheme();
    initLang();
    initForm();
  }
})();
