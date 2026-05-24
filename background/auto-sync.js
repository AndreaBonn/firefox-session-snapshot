// Session Snapshot - Auto-sync for tracked windows
// Keeps saved sessions in sync when their restored window changes.
// Depends on: validation.js, storage.js, session-crud.js

async function getTrackedWindows() {
  const data = await browser.storage.local.get(STORAGE_TRACKED_WINDOWS_KEY);
  return data[STORAGE_TRACKED_WINDOWS_KEY] || {};
}

async function setTrackedWindows(tracked) {
  await browser.storage.local.set({ [STORAGE_TRACKED_WINDOWS_KEY]: tracked });
}

async function trackWindow(windowId, sessionId) {
  const tracked = await getTrackedWindows();
  tracked[windowId] = sessionId;
  await setTrackedWindows(tracked);
}

async function untrackWindow(windowId) {
  const tracked = await getTrackedWindows();
  delete tracked[windowId];
  await setTrackedWindows(tracked);
}

async function untrackSessionWindows(sessionId) {
  const tracked = await getTrackedWindows();
  const updated = {};
  for (const [wId, sId] of Object.entries(tracked)) {
    if (sId !== sessionId) updated[wId] = sId;
  }
  await setTrackedWindows(updated);
}

// --- Debounced sync ---

const syncTimers = {};

function scheduleSyncForWindow(windowId) {
  if (syncTimers[windowId]) {
    clearTimeout(syncTimers[windowId]);
  }
  syncTimers[windowId] = setTimeout(async () => {
    delete syncTimers[windowId];
    await syncTrackedWindow(windowId);
  }, AUTO_SYNC_DEBOUNCE_MS);
}

async function syncTrackedWindow(windowId) {
  const tracked = await getTrackedWindows();
  const sessionId = tracked[windowId];
  if (!sessionId) return;

  const session = await getSession(sessionId);
  if (!session) {
    await untrackWindow(windowId);
    return;
  }

  try {
    const tabs = await buildTabsFromWindow(windowId);
    if (tabs.length === 0) return;

    const updatedSession = {
      ...session,
      updatedAt: Date.now(),
      windowId,
      tabs,
      tabCount: tabs.length,
    };

    await browser.storage.local.set({
      [`${STORAGE_SESSION_PREFIX}${sessionId}`]: updatedSession,
    });
  } catch (err) {
    console.warn("Session Snapshot: sync failed for window", windowId, "-", err);
    await untrackWindow(windowId);
  }
}

// --- Scroll restore on tab load ---

async function restorePendingScroll(tabId) {
  const data = await browser.storage.local.get(STORAGE_PENDING_SCROLL_KEY);
  const scrollMap = data[STORAGE_PENDING_SCROLL_KEY] || {};

  if (!scrollMap[tabId]) return;

  try {
    await browser.tabs.sendMessage(tabId, {
      action: "restore-scroll",
      x: scrollMap[tabId].x,
      y: scrollMap[tabId].y,
    });
  } catch {
    // Content script not available on this page
  }

  delete scrollMap[tabId];
  await browser.storage.local.set({ [STORAGE_PENDING_SCROLL_KEY]: scrollMap });
}

// --- Event listeners ---

browser.tabs.onCreated.addListener(async (tab) => {
  if (!tab.windowId) return;
  const tracked = await getTrackedWindows();
  if (tracked[tab.windowId]) {
    scheduleSyncForWindow(tab.windowId);
  }
});

browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  if (removeInfo.isWindowClosing) return;
  const tracked = await getTrackedWindows();
  if (tracked[removeInfo.windowId]) {
    scheduleSyncForWindow(removeInfo.windowId);
  }
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    await restorePendingScroll(tabId);
  }

  if (changeInfo.url && tab.windowId) {
    const tracked = await getTrackedWindows();
    if (tracked[tab.windowId]) {
      scheduleSyncForWindow(tab.windowId);
    }
  }
});

browser.windows.onRemoved.addListener(async (windowId) => {
  // Final sync before untracking (best-effort for tracked windows)
  const tracked = await getTrackedWindows();
  if (tracked[windowId]) {
    const sessionId = tracked[windowId];
    const session = await getSession(sessionId);
    if (session) {
      // Window is closing - use last known state (already synced by debounce).
      // We can't query tabs from a closing window, so we just update the timestamp.
      session.updatedAt = Date.now();
      await browser.storage.local.set({
        [`${STORAGE_SESSION_PREFIX}${sessionId}`]: session,
      });
    }
  }

  await untrackWindow(windowId);
  delete syncTimers[windowId];
});
