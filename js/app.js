/**
 * Verodevs landing: смена языка и отправка формы напрямую в Telegram.
 */
(function () {
  const CONFIG = {
    TELEGRAM_BOT_TOKEN: "8643532575:AAE75fY89tM4lQsc_bTl8KcTXopbPhRqNAg",
    TELEGRAM_CHAT_ID: "-1003863215260",
  };

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

  function buildTelegramText(payload) {
    return [
      "Новая заявка с сайта Verodevs",
      "",
      "Имя: " + payload.name,
      "Телефон: " + payload.phone,
      "Язык: " + payload.lang,
      "Дата: " + payload.sentAt,
      "",
      "Задача:",
      payload.message,
    ].join("\n");
  }

  function addHiddenField(form, name, value) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  async function submitLead(payload) {
    const iframeName = "telegram-submit-" + Date.now();
    const iframe = document.createElement("iframe");
    const form = document.createElement("form");
    let done = false;

    iframe.name = iframeName;
    iframe.style.display = "none";

    form.method = "POST";
    form.action = "https://api.telegram.org/bot" + CONFIG.TELEGRAM_BOT_TOKEN + "/sendMessage";
    form.target = iframeName;
    form.style.display = "none";

    addHiddenField(form, "chat_id", CONFIG.TELEGRAM_CHAT_ID);
    addHiddenField(form, "text", buildTelegramText(payload));
    addHiddenField(form, "disable_web_page_preview", "true");

    document.body.appendChild(iframe);
    document.body.appendChild(form);

    await new Promise(function (resolve, reject) {
      const timer = window.setTimeout(function () {
        finish(resolve);
      }, 2500);

      function finish(fn) {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        window.setTimeout(function () {
          iframe.remove();
          form.remove();
        }, 0);
        fn();
      }

      iframe.addEventListener("load", function () {
        finish(resolve);
      });

      iframe.addEventListener("error", function () {
        finish(function () {
          reject(new Error("Telegram frame failed"));
        });
      });

      form.submit();
    });

    return { ok: true };
  }

  function getFormMessages() {
    const lang = getStoredLang() || VerodevsI18n.DEFAULT_LANG;
    return VerodevsI18n.getStrings(lang);
  }

  function getPhoneDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function getLocalPhoneDigits(value, countryCode) {
    const phoneDigits = getPhoneDigits(value);
    const countryDigits = getPhoneDigits(countryCode);
    return phoneDigits.indexOf(countryDigits) === 0
      ? phoneDigits.slice(countryDigits.length)
      : phoneDigits;
  }

  function formatPhone(countryCode, localDigits) {
    const digits = String(localDigits || "").replace(/\D/g, "");
    return countryCode + (digits ? " " + digits : " ");
  }

  function initPhoneField(form) {
    const countrySelect = form.querySelector('select[name="phoneCountry"]');
    const phoneInput = form.querySelector('input[name="phone"]');
    if (!countrySelect || !phoneInput) return;
    let previousCountryCode = countrySelect.value;

    function syncPhone() {
      phoneInput.value = formatPhone(
        countrySelect.value,
        getLocalPhoneDigits(phoneInput.value, countrySelect.value)
      );
    }

    countrySelect.addEventListener("change", function () {
      const localDigits = getLocalPhoneDigits(phoneInput.value, previousCountryCode);
      previousCountryCode = countrySelect.value;
      phoneInput.value = formatPhone(countrySelect.value, localDigits);
      phoneInput.focus();
    });

    phoneInput.addEventListener("focus", syncPhone);
    phoneInput.addEventListener("input", syncPhone);
    phoneInput.addEventListener("paste", function () {
      window.setTimeout(syncPhone, 0);
    });
    form.addEventListener("reset", function () {
      window.setTimeout(function () {
        previousCountryCode = countrySelect.value;
        syncPhone();
      }, 0);
    });

    syncPhone();
  }

  function initForm() {
    const form = document.getElementById("lead-form");
    const statusEl = document.getElementById("form-status");
    if (!form || !statusEl) return;
    initPhoneField(form);

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const msgs = getFormMessages();
      statusEl.textContent = "";
      statusEl.classList.remove("is-error", "is-ok");

      const fd = new FormData(form);
      const name = String(fd.get("name") || "").trim();
      const phone = String(fd.get("phone") || "").trim();
      const phoneCountry = String(fd.get("phoneCountry") || "").trim();
      const message = String(fd.get("message") || "").trim();

      if (!name || !getLocalPhoneDigits(phone, phoneCountry) || !message) {
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
