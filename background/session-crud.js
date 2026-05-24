// Session Snapshot - Session CRUD operations
// Save, restore, delete, rename, update sessions.
// Depends on: validation.js, storage.js

async function captureTabScroll(tabId) {
  try {
    const scroll = await browser.tabs.sendMessage(tabId, { action: "get-scroll" });
    return { x: sanitizeScroll(scroll.x), y: sanitizeScroll(scroll.y) };
  } catch {
    return { x: 0, y: 0 };
  }
}

async function buildTabsFromWindow(windowId) {
  const currentWindow = await browser.windows.get(windowId, { populate: true });
  return currentWindow.tabs
    .filter((tab) => !isExcludedUrl(tab.url))
    .map((tab) => ({
      index: tab.index,
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl || null,
      active: tab.active,
      pinned: tab.pinned,
      scrollX: 0,
      scrollY: 0,
    }));
}

async function saveSession(name, color, tags) {
  const currentWindow = await browser.windows.getCurrent({ populate: true });
  const validTabs = currentWindow.tabs.filter((tab) => !isExcludedUrl(tab.url));

  if (validTabs.length === 0) {
    return { success: false, error: t("error.no_valid_tabs") };
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
  const id = `sess_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const index = await getIndex();

  const locale = i18nGetLang() === "en" ? "en-US" : "it-IT";
  const defaultName = t("default.session_name", { date: new Date(now).toLocaleDateString(locale) });
  const sanitizedName = sanitizeName(name) || defaultName;
  const resolvedName = await deduplicateName(sanitizedName, null);
  const validColor = isValidColor(color) ? color : getAutoColor(index.length);
  const validTags = sanitizeTags(tags);

  const session = {
    id,
    name: resolvedName,
    createdAt: now,
    updatedAt: now,
    windowId: currentWindow.id,
    tabs,
    tabCount: tabs.length,
    color: validColor,
    tags: validTags,
  };

  index.unshift(id);
  await browser.storage.local.set({
    [STORAGE_INDEX_KEY]: index,
    [`${STORAGE_SESSION_PREFIX}${id}`]: session,
  });

  return { success: true, session };
}

async function saveSessionWithId(sessionId, name, color) {
  const currentWindow = await browser.windows.getCurrent({ populate: true });
  const validTabs = currentWindow.tabs.filter((tab) => !isExcludedUrl(tab.url));

  if (validTabs.length === 0) {
    return { success: false, error: t("error.no_valid_tabs") };
  }

  const existing = await getSession(sessionId);
  if (!existing) return { success: false, error: t("error.session_not_found") };

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

async function restoreSession(sessionId) {
  const session = await getSession(sessionId);
  if (!session) return { success: false, error: t("error.session_not_found") };

  const safeTabs = session.tabs.filter((tab) => isAllowedUrlScheme(tab.url));
  if (safeTabs.length === 0) {
    return { success: false, error: t("error.no_valid_url_tabs") };
  }

  const firstTab = safeTabs.find((tab) => !tab.pinned) || safeTabs[0];
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

  const activeTabData = safeTabs.find((tab) => tab.active);
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

  await trackWindow(newWindowId, sessionId);

  return { success: true, windowId: newWindowId };
}

async function deleteSession(sessionId) {
  const index = await getIndex();
  const newIndex = index.filter((id) => id !== sessionId);
  await browser.storage.local.remove(`${STORAGE_SESSION_PREFIX}${sessionId}`);
  await browser.storage.local.set({ [STORAGE_INDEX_KEY]: newIndex });

  await untrackSessionWindows(sessionId);

  return { success: true };
}

async function renameSession(sessionId, newName) {
  const session = await getSession(sessionId);
  if (!session) return { success: false, error: t("error.session_not_found") };

  const sanitized = sanitizeName(newName);
  if (!sanitized) return { success: false, error: t("error.invalid_name") };
  const resolvedName = await deduplicateName(sanitized, sessionId);
  session.name = resolvedName;
  session.updatedAt = Date.now();

  await browser.storage.local.set({
    [`${STORAGE_SESSION_PREFIX}${sessionId}`]: session,
  });

  return { success: true, session };
}

async function updateSession(sessionId) {
  const existing = await getSession(sessionId);
  if (!existing) return { success: false, error: t("error.session_not_found") };
  return saveSessionWithId(sessionId, existing.name, existing.color);
}

async function updateSessionTags(sessionId, tags) {
  const session = await getSession(sessionId);
  if (!session) return { success: false, error: t("error.session_not_found") };

  session.tags = sanitizeTags(tags);
  session.updatedAt = Date.now();

  await browser.storage.local.set({
    [`${STORAGE_SESSION_PREFIX}${sessionId}`]: session,
  });

  return { success: true, session };
}
