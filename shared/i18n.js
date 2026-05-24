// Session Snapshot - i18n module
// Lightweight translation system with runtime language switching.
// Works in both popup and background contexts.

const I18N_STORAGE_KEY = "ss_lang";
const I18N_DEFAULT_LANG = "it";
const I18N_SUPPORTED_LANGS = ["it", "en"];

let i18nCurrentLang = I18N_DEFAULT_LANG;
let i18nDictionary = {};
let i18nDictionaries = {};

/**
 * Initialize i18n: load dictionaries and restore saved language.
 *
 * Parameters
 * ----------
 * dictionaries : object
 *     Map of lang code to translation object, e.g. { it: {...}, en: {...} }
 *
 * Returns
 * -------
 * Promise<string>
 *     The active language code.
 */
async function i18nInit(dictionaries) {
  i18nDictionaries = dictionaries;

  const stored = await browser.storage.local.get(I18N_STORAGE_KEY);
  const savedLang = stored[I18N_STORAGE_KEY];

  if (savedLang && I18N_SUPPORTED_LANGS.includes(savedLang)) {
    i18nCurrentLang = savedLang;
  } else {
    i18nCurrentLang = I18N_DEFAULT_LANG;
  }

  i18nDictionary = i18nDictionaries[i18nCurrentLang] || {};
  return i18nCurrentLang;
}

/**
 * Translate a key, interpolating placeholders like {{name}}.
 *
 * Parameters
 * ----------
 * key : string
 *     Dot-notation key, e.g. "header.save_session"
 * params : object, optional
 *     Interpolation values, e.g. { count: 5 }
 *
 * Returns
 * -------
 * string
 *     Translated string or key itself if not found.
 */
function t(key, params) {
  let value = i18nDictionary[key];
  if (value === undefined) return key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`{{${k}}}`, "g"), String(v));
    }
  }

  return value;
}

/**
 * Switch language at runtime and persist choice.
 *
 * Parameters
 * ----------
 * lang : string
 *     Language code ("it" or "en").
 *
 * Returns
 * -------
 * Promise<void>
 */
async function i18nSetLang(lang) {
  if (!I18N_SUPPORTED_LANGS.includes(lang)) return;

  i18nCurrentLang = lang;
  i18nDictionary = i18nDictionaries[lang] || {};
  await browser.storage.local.set({ [I18N_STORAGE_KEY]: lang });
}

/**
 * Get the current active language.
 *
 * Returns
 * -------
 * string
 */
function i18nGetLang() {
  return i18nCurrentLang;
}

/**
 * Translate all DOM elements with data-i18n attributes.
 * Supports: data-i18n (textContent), data-i18n-placeholder, data-i18n-title.
 */
function translatePage() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.placeholder = t(key);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.title = t(key);
  });
}
