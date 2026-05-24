// Session Snapshot - Export/Import UI
// Handles file download for export and file picker for import.
// Depends on: ui-utils.js, toast.js (loaded before this file)

async function handleExport() {
  try {
    const data = await browser.runtime.sendMessage({ action: "export-sessions" });
    downloadJson(data, "session-snapshot-export.json");
  } catch (err) {
    console.error("Session Snapshot: export failed -", err);
  }
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function handleImport(event, onDone) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const result = await browser.runtime.sendMessage({
      action: "import-sessions",
      data: text,
    });

    if (result.success) {
      showInfoToast(`${result.count} sessioni importate`);
      if (onDone) await onDone();
    } else {
      showInfoToast(result.error);
    }
  } catch (err) {
    console.error("Session Snapshot: import failed -", err);
    showInfoToast("Errore durante l'importazione");
  }

  event.target.value = "";
}

async function loadStorageStats() {
  try {
    const stats = await browser.runtime.sendMessage({ action: "get-storage-stats" });
    const el = document.getElementById("ss-storage-info");
    const mb = (stats.bytesUsed / (1024 * 1024)).toFixed(2);
    el.textContent = `${mb} MB usati \u00B7 ${stats.sessionCount} sessioni`;
  } catch {
    // Stats are non-critical
  }
}
