// Session Snapshot - Background i18n initialization
// Loads dictionaries via fetch and initializes i18n for background scripts.

const I18N_BG_READY = (async () => {
  const [itRes, enRes] = await Promise.all([
    fetch(browser.runtime.getURL("_locales/it.json")),
    fetch(browser.runtime.getURL("_locales/en.json")),
  ]);
  const dictionaries = {
    it: await itRes.json(),
    en: await enRes.json(),
  };
  await i18nInit(dictionaries);
})();
