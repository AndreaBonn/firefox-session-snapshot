// Session Snapshot - UI Utilities
// Shared helpers for popup modules. Loaded after shared/constants.js.

function safeColor(color) {
  return HEX_COLOR_PATTERN.test(color) ? color : "#374151";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatAge(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  const locale = i18nGetLang() === "en" ? "en-US" : "it-IT";

  if (minutes < 1) return t("age.just_now");
  if (minutes < 60) return t("age.minutes_ago", { minutes });
  if (hours < 24) {
    const time = new Date(timestamp).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return t("age.today", { time });
  }
  if (days === 1) return t("age.yesterday");
  if (days < 7) return t("age.days_ago", { days });
  return t("age.date", { date: new Date(timestamp).toLocaleDateString(locale) });
}
