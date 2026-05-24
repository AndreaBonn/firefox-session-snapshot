// Session Snapshot - Export/Import
// Handles session data export to JSON and import with validation.
// Depends on: validation.js, storage.js

const EXPORT_FORMAT_VERSION = 1;

async function exportSessions() {
  const { sessions } = await getSessions();
  return {
    version: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    sessions: sessions.map(stripSessionInternals),
  };
}

async function exportSingleSession(sessionId) {
  const session = await getSession(sessionId);
  if (!session) return { success: false, error: t("error.session_not_found") };

  return {
    success: true,
    data: {
      version: EXPORT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      sessions: [stripSessionInternals(session)],
    },
  };
}

function stripSessionInternals(session) {
  return {
    name: session.name,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    color: session.color,
    tags: session.tags || [],
    tabs: (session.tabs || []).map((tab) => ({
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl || null,
      pinned: tab.pinned,
      scrollX: tab.scrollX || 0,
      scrollY: tab.scrollY || 0,
    })),
  };
}

async function importSessions(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { success: false, error: t("error.invalid_json") };
  }

  const validation = validateImportData(parsed);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const index = await getIndex();
  const imported = [];

  for (const entry of parsed.sessions) {
    const now = Date.now();
    const id = `sess_${now}_${Math.random().toString(36).slice(2, 8)}`;

    const sanitizedName = sanitizeName(entry.name) || t("default.imported_session");
    const resolvedName = await deduplicateName(sanitizedName, null);

    const tabs = (entry.tabs || [])
      .filter((t) => typeof t.url === "string" && isAllowedUrlScheme(t.url))
      .map((t, i) => ({
        index: i,
        url: t.url,
        title: sanitizeName(t.title) || t.url,
        favIconUrl:
          typeof t.favIconUrl === "string" && isAllowedUrlScheme(t.favIconUrl)
            ? t.favIconUrl
            : null,
        active: i === 0,
        pinned: Boolean(t.pinned),
        scrollX: sanitizeScroll(t.scrollX),
        scrollY: sanitizeScroll(t.scrollY),
      }));

    if (tabs.length === 0) continue;

    const session = {
      id,
      name: resolvedName,
      createdAt: typeof entry.createdAt === "number" ? entry.createdAt : now,
      updatedAt: now,
      windowId: null,
      tabs,
      tabCount: tabs.length,
      color: isValidColor(entry.color) ? entry.color : getAutoColor(index.length + imported.length),
      tags: sanitizeTags(entry.tags),
    };

    index.unshift(id);
    await browser.storage.local.set({
      [`${STORAGE_SESSION_PREFIX}${id}`]: session,
    });

    imported.push(session);
  }

  await browser.storage.local.set({ [STORAGE_INDEX_KEY]: index });

  return { success: true, count: imported.length };
}

function validateImportData(data) {
  if (!data || typeof data !== "object") {
    return { valid: false, error: t("error.invalid_format") };
  }
  if (!Array.isArray(data.sessions)) {
    return { valid: false, error: t("error.missing_sessions_field") };
  }
  if (data.sessions.length === 0) {
    return { valid: false, error: t("error.no_sessions_to_import") };
  }

  const MAX_IMPORT_SESSIONS = 100;
  if (data.sessions.length > MAX_IMPORT_SESSIONS) {
    return { valid: false, error: t("error.too_many_sessions", { max: MAX_IMPORT_SESSIONS }) };
  }

  for (const session of data.sessions) {
    if (!session || typeof session !== "object") {
      return { valid: false, error: t("error.invalid_session_in_file") };
    }
    if (!Array.isArray(session.tabs) || session.tabs.length === 0) {
      return { valid: false, error: t("error.session_no_tabs", { name: session.name || "?" }) };
    }
  }

  return { valid: true };
}

// --- Storage stats ---

async function getStorageStats() {
  const data = await browser.storage.local.get(null);
  const serialized = JSON.stringify(data);
  const bytesUsed = new Blob([serialized]).size;
  const index = data[STORAGE_INDEX_KEY] || [];

  return {
    bytesUsed,
    sessionCount: index.length,
  };
}
