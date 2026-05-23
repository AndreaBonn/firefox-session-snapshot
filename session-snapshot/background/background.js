// Session Snapshot - Background Script
// Handles session CRUD operations via message passing with popup and content scripts.
// Constants and validation functions are loaded from validation.js (via manifest).

// --- Storage helpers ---

async function getIndex() {
  const data = await browser.storage.local.get(STORAGE_INDEX_KEY);
  return data[STORAGE_INDEX_KEY] || [];
}

async function getSession(sessionId) {
  const key = `${STORAGE_SESSION_PREFIX}${sessionId}`;
  const data = await browser.storage.local.get(key);
  return data[key] || null;
}

async function getSessions() {
  const index = await getIndex();
  if (index.length === 0) return { sessions: [] };

  const keys = index.map((id) => `${STORAGE_SESSION_PREFIX}${id}`);
  const data = await browser.storage.local.get(keys);
  const sessions = index
    .map((id) => data[`${STORAGE_SESSION_PREFIX}${id}`])
    .filter(Boolean);

  return { sessions };
}

// --- Duplicate name handling ---

async function deduplicateName(name, excludeId) {
  const { sessions } = await getSessions();
  const existingNames = sessions
    .filter((s) => s.id !== excludeId)
    .map((s) => s.name);

  if (!existingNames.includes(name)) return name;

  let counter = 2;
  let candidate = `${name} (${counter})`;
  while (existingNames.includes(candidate)) {
    counter++;
    candidate = `${name} (${counter})`;
  }
  return candidate;
}

// --- Scroll capture from tabs ---

async function captureTabScroll(tabId) {
  try {
    const scroll = await browser.tabs.sendMessage(tabId, { action: "get-scroll" });
    return { x: sanitizeScroll(scroll.x), y: sanitizeScroll(scroll.y) };
  } catch {
    return { x: 0, y: 0 };
  }
}

// --- Core: save session ---

async function saveSession(name, color) {
  const currentWindow = await browser.windows.getCurrent({ populate: true });
  const validTabs = currentWindow.tabs.filter((tab) => !isExcludedUrl(tab.url));

  if (validTabs.length === 0) {
    return { success: false, error: "Nessuna scheda valida da salvare" };
  }

  const tabs = await Promise.all(
    validTabs.map(async (tab) => {
      const scroll = await captureTabScroll(tab.id);
      return {
        index: tab.index,
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl || null,
        active: tab.active,
        pinned: tab.pinned,
        scrollX: scroll.x,
        scrollY: scroll.y,
      };
    })
  );

  const now = Date.now();
  const id = `sess_${now}`;
  const index = await getIndex();

  const defaultName = `Sessione del ${new Date(now).toLocaleDateString("it-IT")}`;
  const sanitizedName = sanitizeName(name) || defaultName;
  const resolvedName = await deduplicateName(sanitizedName, null);
  const validColor = isValidColor(color) ? color : getAutoColor(index.length);

  const session = {
    id,
    name: resolvedName,
    createdAt: now,
    updatedAt: now,
    windowId: currentWindow.id,
    tabs,
    tabCount: tabs.length,
    color: validColor,
  };

  index.unshift(id);
  await browser.storage.local.set({
    [STORAGE_INDEX_KEY]: index,
    [`${STORAGE_SESSION_PREFIX}${id}`]: session,
  });

  return { success: true, session };
}

// --- Core: save with existing ID (for update) ---

async function saveSessionWithId(sessionId, name, color) {
  const currentWindow = await browser.windows.getCurrent({ populate: true });
  const validTabs = currentWindow.tabs.filter((tab) => !isExcludedUrl(tab.url));

  if (validTabs.length === 0) {
    return { success: false, error: "Nessuna scheda valida da salvare" };
  }

  const existing = await getSession(sessionId);
  if (!existing) return { success: false, error: "Sessione non trovata" };

  const tabs = await Promise.all(
    validTabs.map(async (tab) => {
      const scroll = await captureTabScroll(tab.id);
      return {
        index: tab.index,
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl || null,
        active: tab.active,
        pinned: tab.pinned,
        scrollX: scroll.x,
        scrollY: scroll.y,
      };
    })
  );

  const session = {
    ...existing,
    updatedAt: Date.now(),
    windowId: currentWindow.id,
    tabs,
    tabCount: tabs.length,
    name: sanitizeName(name) || existing.name,
    color: isValidColor(color) ? color : existing.color,
  };

  await browser.storage.local.set({
    [`${STORAGE_SESSION_PREFIX}${sessionId}`]: session,
  });

  return { success: true, session };
}

// --- Core: restore session ---

async function restoreSession(sessionId) {
  const session = await getSession(sessionId);
  if (!session) return { success: false, error: "Sessione non trovata" };

  const safeTabs = session.tabs.filter((t) => isAllowedUrlScheme(t.url));
  if (safeTabs.length === 0) {
    return { success: false, error: "Nessuna scheda con URL valido" };
  }

  const firstTab = safeTabs.find((t) => !t.pinned) || safeTabs[0];
  const newWindow = await browser.windows.create({
    url: firstTab.url,
    focused: true,
  });

  const newWindowId = newWindow.id;
  const createdTabIds = [newWindow.tabs[0].id];
  const firstTabIndex = safeTabs.indexOf(firstTab);

  const remainingTabs = safeTabs
    .filter((_, i) => i !== firstTabIndex)
    .sort((a, b) => a.index - b.index);

  for (const tab of remainingTabs) {
    const created = await browser.tabs.create({
      windowId: newWindowId,
      url: tab.url,
      pinned: tab.pinned,
      active: false,
    });
    createdTabIds.push(created.id);
  }

  const activeTabData = safeTabs.find((t) => t.active);
  if (activeTabData) {
    const activeIndex = safeTabs.indexOf(activeTabData);
    if (createdTabIds[activeIndex]) {
      await browser.tabs.update(createdTabIds[activeIndex], { active: true });
    }
  }

  const updatedSession = { ...session, windowId: newWindowId };
  await browser.storage.local.set({
    [`${STORAGE_SESSION_PREFIX}${sessionId}`]: updatedSession,
  });

  const scrollMap = {};
  safeTabs.forEach((tab, i) => {
    if (createdTabIds[i]) {
      scrollMap[createdTabIds[i]] = { x: tab.scrollX, y: tab.scrollY };
    }
  });
  await browser.storage.local.set({ [STORAGE_PENDING_SCROLL_KEY]: scrollMap });

  return { success: true, windowId: newWindowId };
}

// --- Core: delete session ---

async function deleteSession(sessionId) {
  const index = await getIndex();
  const newIndex = index.filter((id) => id !== sessionId);
  await browser.storage.local.remove(`${STORAGE_SESSION_PREFIX}${sessionId}`);
  await browser.storage.local.set({ [STORAGE_INDEX_KEY]: newIndex });
  return { success: true };
}

// --- Core: rename session ---

async function renameSession(sessionId, newName) {
  const session = await getSession(sessionId);
  if (!session) return { success: false, error: "Sessione non trovata" };

  const sanitized = sanitizeName(newName);
  if (!sanitized) return { success: false, error: "Nome non valido" };
  const resolvedName = await deduplicateName(sanitized, sessionId);
  session.name = resolvedName;
  session.updatedAt = Date.now();

  await browser.storage.local.set({
    [`${STORAGE_SESSION_PREFIX}${sessionId}`]: session,
  });

  return { success: true, session };
}

// --- Core: update session (overwrite tabs with current window) ---

async function updateSession(sessionId) {
  const existing = await getSession(sessionId);
  if (!existing) return { success: false, error: "Sessione non trovata" };
  return saveSessionWithId(sessionId, existing.name, existing.color);
}

// --- Message listener ---

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only allow mutation actions from the extension popup, not from content scripts
  const isFromContentScript = Boolean(sender.tab);
  const mutationActions = [
    "save-session", "restore-session", "delete-session",
    "rename-session", "update-session",
  ];

  if (isFromContentScript && mutationActions.includes(message.action)) {
    return false;
  }

  // Validate sessionId format for actions that require it
  const needsSessionId = [
    "restore-session", "delete-session", "rename-session", "update-session",
  ];
  if (needsSessionId.includes(message.action) && !isValidSessionId(message.sessionId)) {
    sendResponse({ success: false, error: "ID sessione non valido" });
    return true;
  }

  const handlers = {
    "get-sessions": () => getSessions(),
    "save-session": () => saveSession(message.name, message.color),
    "restore-session": () => restoreSession(message.sessionId),
    "delete-session": () => deleteSession(message.sessionId),
    "rename-session": () => renameSession(message.sessionId, message.name),
    "update-session": () => updateSession(message.sessionId),
  };

  const handler = handlers[message.action];
  if (handler) {
    handler().then(sendResponse);
    return true;
  }
});

// --- Scroll restore on tab load ---

browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;

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
});

// --- Keyboard shortcut handler ---

browser.commands.onCommand.addListener(async (command) => {
  if (command === "save-session") {
    const result = await saveSession(null, null);
    if (!result.success) {
      console.warn("Session Snapshot: quick save failed -", result.error);
    }
  }
});
