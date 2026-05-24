// Session Snapshot - Background Script (main entry point)
// Message listener, deferred delete, and keyboard shortcuts.
// Depends on: validation.js, storage.js, session-crud.js, auto-sync.js, export-import.js

// --- Deferred delete (undo-safe) ---

const pendingDeletes = {};

function scheduleDelete(sessionId) {
  cancelDelete(sessionId);

  pendingDeletes[sessionId] = setTimeout(async () => {
    delete pendingDeletes[sessionId];
    await deleteSession(sessionId);
  }, DEFERRED_DELETE_MS);

  return { success: true };
}

function cancelDelete(sessionId) {
  if (pendingDeletes[sessionId]) {
    clearTimeout(pendingDeletes[sessionId]);
    delete pendingDeletes[sessionId];
  }
  return { success: true };
}

// --- Message listener ---

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const isFromContentScript = Boolean(sender.tab);
  const mutationActions = [
    "save-session",
    "restore-session",
    "delete-session",
    "schedule-delete",
    "cancel-delete",
    "rename-session",
    "update-session",
    "update-session-tags",
    "import-sessions",
  ];

  if (isFromContentScript && mutationActions.includes(message.action)) {
    return false;
  }

  const needsSessionId = [
    "restore-session",
    "delete-session",
    "schedule-delete",
    "cancel-delete",
    "rename-session",
    "update-session",
    "update-session-tags",
    "export-session",
  ];
  if (needsSessionId.includes(message.action) && !isValidSessionId(message.sessionId)) {
    sendResponse({ success: false, error: "ID sessione non valido" });
    return true;
  }

  const handlers = {
    "get-sessions": () => getSessions(),
    "save-session": () => saveSession(message.name, message.color, message.tags),
    "restore-session": () => restoreSession(message.sessionId),
    "delete-session": () => deleteSession(message.sessionId),
    "schedule-delete": () => Promise.resolve(scheduleDelete(message.sessionId)),
    "cancel-delete": () => Promise.resolve(cancelDelete(message.sessionId)),
    "rename-session": () => renameSession(message.sessionId, message.name),
    "update-session": () => updateSession(message.sessionId),
    "update-session-tags": () => updateSessionTags(message.sessionId, message.tags),
    "get-tracked-windows": () => getTrackedWindows(),
    "export-sessions": () => exportSessions(),
    "export-session": () => exportSingleSession(message.sessionId),
    "import-sessions": () => importSessions(message.data),
    "get-storage-stats": () => getStorageStats(),
  };

  const handler = handlers[message.action];
  if (handler) {
    handler().then(sendResponse);
    return true;
  }
});

// --- Keyboard shortcut handler ---

browser.commands.onCommand.addListener(async (command) => {
  if (command === "save-session") {
    const result = await saveSession(null, null, []);
    if (!result.success) {
      console.warn("Session Snapshot: quick save failed -", result.error);
    }
  }
});
