// Session Snapshot - i18n dictionaries loader
// Fetches JSON dictionaries and exposes them for i18nInit().

const I18N_DICTIONARIES_PROMISE = (async () => {
  const [itRes, enRes] = await Promise.all([
    fetch(browser.runtime.getURL("_locales/it.json")),
    fetch(browser.runtime.getURL("_locales/en.json")),
  ]);
  return {
    it: await itRes.json(),
    en: await enRes.json(),
  };
})();
