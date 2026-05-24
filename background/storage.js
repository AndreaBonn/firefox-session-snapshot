// Session Snapshot - Storage helpers
// Low-level read/write operations for session index and individual sessions.
// Depends on: validation.js (constants)

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
  const sessions = index.map((id) => data[`${STORAGE_SESSION_PREFIX}${id}`]).filter(Boolean);

  return { sessions };
}

async function deduplicateName(name, excludeId) {
  const { sessions } = await getSessions();
  const existingNames = sessions.filter((s) => s.id !== excludeId).map((s) => s.name);

  if (!existingNames.includes(name)) return name;

  let counter = 2;
  let candidate = `${name} (${counter})`;
  while (existingNames.includes(candidate)) {
    counter++;
    candidate = `${name} (${counter})`;
  }
  return candidate;
}
