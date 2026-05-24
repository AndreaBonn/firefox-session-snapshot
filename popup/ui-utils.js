// Session Snapshot - UI Utilities
// Shared helpers for popup modules. Loaded first via script tag.

const AUTO_COLORS = [
  "#0969da",
  "#1a7f37",
  "#9a3412",
  "#6e40c9",
  "#b45309",
  "#0e7490",
  "#be185d",
  "#374151",
];

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

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

  if (minutes < 1) return "Salvata ora";
  if (minutes < 60) return `Salvata ${minutes} min fa`;
  if (hours < 24) {
    const time = new Date(timestamp).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `Salvata oggi, ${time}`;
  }
  if (days === 1) return "Salvata ieri";
  if (days < 7) return `Salvata ${days} giorni fa`;
  return `Salvata il ${new Date(timestamp).toLocaleDateString("it-IT")}`;
}
