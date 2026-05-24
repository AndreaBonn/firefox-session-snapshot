const { loadScript } = require("./helpers");

// Load scripts in manifest order
loadScript("background/validation.js");
loadScript("background/storage.js");
loadScript("background/session-crud.js");
loadScript("background/auto-sync.js");
loadScript("background/export-import.js");
loadScript("background/background.js");

describe("background: storage helpers", () => {
  beforeEach(() => {
    resetBrowserMocks();
  });

  test("getIndex returns empty array when no index exists", async () => {
    const result = await getIndex();
    expect(result).toEqual([]);
  });

  test("getIndex returns stored index", async () => {
    const ids = ["sess_100", "sess_200"];
    await browser.storage.local.set({ snapshot_index: ids });

    const result = await getIndex();
    expect(result).toEqual(ids);
  });

  test("getSession returns null for non-existent session", async () => {
    const result = await getSession("sess_nonexistent");
    expect(result).toBeNull();
  });

  test("getSession returns stored session object", async () => {
    const session = { id: "sess_100", name: "Test", tabs: [] };
    await browser.storage.local.set({ snapshot_sess_100: session });

    const result = await getSession("sess_100");
    expect(result).toEqual(session);
  });

  test("getSessions returns all sessions in index order", async () => {
    const s1 = { id: "sess_200", name: "Second" };
    const s2 = { id: "sess_100", name: "First" };
    await browser.storage.local.set({
      snapshot_index: ["sess_200", "sess_100"],
      snapshot_sess_200: s1,
      snapshot_sess_100: s2,
    });

    const result = await getSessions();
    expect(result.sessions).toHaveLength(2);
    expect(result.sessions[0].name).toBe("Second");
    expect(result.sessions[1].name).toBe("First");
  });

  test("getSessions returns empty array when no sessions", async () => {
    const result = await getSessions();
    expect(result.sessions).toEqual([]);
  });
});

describe("background: URL filtering", () => {
  test("excludes about: URLs", () => {
    expect(isExcludedUrl("about:newtab")).toBe(true);
    expect(isExcludedUrl("about:blank")).toBe(true);
    expect(isExcludedUrl("about:home")).toBe(true);
  });

  test("excludes moz-extension: URLs", () => {
    expect(isExcludedUrl("moz-extension://abc/popup.html")).toBe(true);
  });

  test("allows normal URLs", () => {
    expect(isExcludedUrl("https://example.com")).toBe(false);
    expect(isExcludedUrl("http://localhost:3000")).toBe(false);
    expect(isExcludedUrl("file:///home/user/doc.html")).toBe(false);
  });
});

describe("background: auto color", () => {
  test("cycles through AUTO_COLORS based on index length", () => {
    expect(getAutoColor(0)).toBe("#0969da");
    expect(getAutoColor(1)).toBe("#1a7f37");
    expect(getAutoColor(7)).toBe("#374151");
    // Wraps around
    expect(getAutoColor(8)).toBe("#0969da");
    expect(getAutoColor(16)).toBe("#0969da");
  });
});

describe("background: input validation", () => {
  test("isValidSessionId accepts valid IDs", () => {
    expect(isValidSessionId("sess_1704067200000")).toBe(true);
    expect(isValidSessionId("sess_0")).toBe(true);
  });

  test("isValidSessionId rejects invalid IDs", () => {
    expect(isValidSessionId("")).toBe(false);
    expect(isValidSessionId("invalid")).toBe(false);
    expect(isValidSessionId("sess_abc")).toBe(false);
    expect(isValidSessionId(null)).toBe(false);
    expect(isValidSessionId(123)).toBe(false);
    expect(isValidSessionId("sess_123; DROP TABLE")).toBe(false);
  });

  test("isValidColor accepts valid hex colors", () => {
    expect(isValidColor("#0969da")).toBe(true);
    expect(isValidColor("#FFFFFF")).toBe(true);
    expect(isValidColor("#000000")).toBe(true);
  });

  test("isValidColor rejects invalid colors", () => {
    expect(isValidColor("red")).toBe(false);
    expect(isValidColor("#fff")).toBe(false);
    expect(isValidColor("red); } body { display:none")).toBe(false);
    expect(isValidColor(null)).toBe(false);
    expect(isValidColor("")).toBe(false);
  });

  test("sanitizeName truncates to max length", () => {
    const longName = "A".repeat(200);
    expect(sanitizeName(longName).length).toBe(MAX_SESSION_NAME_LENGTH);
  });

  test("sanitizeName trims whitespace", () => {
    expect(sanitizeName("  test  ")).toBe("test");
  });

  test("sanitizeName returns empty string for non-string input", () => {
    expect(sanitizeName(null)).toBe("");
    expect(sanitizeName(undefined)).toBe("");
    expect(sanitizeName(123)).toBe("");
  });

  test("sanitizeScroll clamps to valid range", () => {
    expect(sanitizeScroll(100)).toBe(100);
    expect(sanitizeScroll(0)).toBe(0);
    expect(sanitizeScroll(-50)).toBe(0);
    expect(sanitizeScroll(999999)).toBe(MAX_SCROLL_VALUE);
    expect(sanitizeScroll(NaN)).toBe(0);
    expect(sanitizeScroll(Infinity)).toBe(0);
    expect(sanitizeScroll("abc")).toBe(0);
  });

  test("isAllowedUrlScheme accepts http/https/ftp/file", () => {
    expect(isAllowedUrlScheme("https://example.com")).toBe(true);
    expect(isAllowedUrlScheme("http://localhost")).toBe(true);
    expect(isAllowedUrlScheme("ftp://files.example.com")).toBe(true);
    expect(isAllowedUrlScheme("file:///home/doc.html")).toBe(true);
  });

  test("isAllowedUrlScheme rejects dangerous schemes", () => {
    expect(isAllowedUrlScheme("javascript:alert(1)")).toBe(false);
    expect(isAllowedUrlScheme("data:text/html,<h1>")).toBe(false);
    expect(isAllowedUrlScheme("about:blank")).toBe(false);
    expect(isAllowedUrlScheme("not-a-url")).toBe(false);
  });
});

describe("background: duplicate name handling", () => {
  beforeEach(() => {
    resetBrowserMocks();
  });

  test("returns name unchanged when no duplicates", async () => {
    const result = await deduplicateName("Progetto A", null);
    expect(result).toBe("Progetto A");
  });

  test("appends (2) when name already exists", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: { id: "sess_100", name: "Progetto A" },
    });

    const result = await deduplicateName("Progetto A", null);
    expect(result).toBe("Progetto A (2)");
  });

  test("appends (3) when name and (2) already exist", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100", "sess_200"],
      snapshot_sess_100: { id: "sess_100", name: "Progetto A" },
      snapshot_sess_200: { id: "sess_200", name: "Progetto A (2)" },
    });

    const result = await deduplicateName("Progetto A", null);
    expect(result).toBe("Progetto A (3)");
  });

  test("excludes own session when checking for duplicates", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: { id: "sess_100", name: "Progetto A" },
    });

    const result = await deduplicateName("Progetto A", "sess_100");
    expect(result).toBe("Progetto A");
  });
});

describe("background: saveSession", () => {
  beforeEach(() => {
    resetBrowserMocks();
    // Default mock: window with 2 valid tabs
    browser.windows.getCurrent.mockResolvedValue({
      id: 1,
      tabs: [
        {
          id: 101,
          index: 0,
          url: "https://example.com",
          title: "Example",
          favIconUrl: "https://example.com/fav.ico",
          active: true,
          pinned: false,
        },
        {
          id: 102,
          index: 1,
          url: "https://github.com",
          title: "GitHub",
          favIconUrl: null,
          active: false,
          pinned: true,
        },
      ],
    });
    browser.tabs.sendMessage.mockResolvedValue({ x: 0, y: 100 });
  });

  test("saves session with correct structure", async () => {
    const result = await saveSession("My Session", "#0969da");

    expect(result.success).toBe(true);
    expect(result.session.name).toBe("My Session");
    expect(result.session.color).toBe("#0969da");
    expect(result.session.tabs).toHaveLength(2);
    expect(result.session.tabCount).toBe(2);
    expect(result.session.id).toMatch(/^sess_\d+$/);
    expect(result.session.createdAt).toBeDefined();
    expect(result.session.updatedAt).toBe(result.session.createdAt);
  });

  test("captures scroll position from content script", async () => {
    browser.tabs.sendMessage.mockResolvedValue({ x: 50, y: 1240 });

    const result = await saveSession("Test", null);

    expect(result.session.tabs[0].scrollX).toBe(50);
    expect(result.session.tabs[0].scrollY).toBe(1240);
  });

  test("uses scroll 0,0 when content script fails", async () => {
    browser.tabs.sendMessage.mockRejectedValue(new Error("No content script"));

    const result = await saveSession("Test", null);

    expect(result.session.tabs[0].scrollX).toBe(0);
    expect(result.session.tabs[0].scrollY).toBe(0);
  });

  test("excludes about: and moz-extension: tabs", async () => {
    browser.windows.getCurrent.mockResolvedValue({
      id: 1,
      tabs: [
        { id: 101, index: 0, url: "https://example.com", title: "Ex", active: true, pinned: false },
        { id: 102, index: 1, url: "about:newtab", title: "New Tab", active: false, pinned: false },
        {
          id: 103,
          index: 2,
          url: "moz-extension://abc/popup.html",
          title: "Ext",
          active: false,
          pinned: false,
        },
      ],
    });

    const result = await saveSession("Test", null);

    expect(result.session.tabs).toHaveLength(1);
    expect(result.session.tabs[0].url).toBe("https://example.com");
  });

  test("fails when no valid tabs exist", async () => {
    browser.windows.getCurrent.mockResolvedValue({
      id: 1,
      tabs: [
        { id: 101, index: 0, url: "about:blank", title: "Blank", active: true, pinned: false },
      ],
    });

    const result = await saveSession("Test", null);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("assigns auto color when none provided", async () => {
    const result = await saveSession("Test", null);
    expect(AUTO_COLORS).toContain(result.session.color);
  });

  test("rejects invalid color and uses auto color instead", async () => {
    const result = await saveSession("Test", "red; background:red");
    expect(AUTO_COLORS).toContain(result.session.color);
  });

  test("truncates long session name", async () => {
    const longName = "A".repeat(200);
    const result = await saveSession(longName, "#0969da");
    expect(result.session.name.length).toBeLessThanOrEqual(MAX_SESSION_NAME_LENGTH);
  });

  test("generates default name with date when none provided", async () => {
    const result = await saveSession("", null);
    expect(result.session.name).toMatch(/^Sessione del /);
  });

  test("adds session ID to index at the beginning", async () => {
    await saveSession("First", null);
    await saveSession("Second", null);

    const store = browser.storage._getStore();
    const index = store.snapshot_index;
    expect(index).toHaveLength(2);
    // Most recent first
    const firstSession = store[`snapshot_${index[0]}`];
    expect(firstSession.name).toBe("Second");
  });

  test("preserves tab properties: pinned, active, favIconUrl", async () => {
    const result = await saveSession("Test", null);

    const tab0 = result.session.tabs[0];
    expect(tab0.active).toBe(true);
    expect(tab0.pinned).toBe(false);
    expect(tab0.favIconUrl).toBe("https://example.com/fav.ico");

    const tab1 = result.session.tabs[1];
    expect(tab1.active).toBe(false);
    expect(tab1.pinned).toBe(true);
    expect(tab1.favIconUrl).toBeNull();
  });
});

describe("background: deleteSession", () => {
  beforeEach(() => {
    resetBrowserMocks();
  });

  test("removes session from storage and index", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100", "sess_200"],
      snapshot_sess_100: { id: "sess_100", name: "A" },
      snapshot_sess_200: { id: "sess_200", name: "B" },
    });

    const result = await deleteSession("sess_100");

    expect(result.success).toBe(true);
    const store = browser.storage._getStore();
    expect(store.snapshot_index).toEqual(["sess_200"]);
    expect(store.snapshot_sess_100).toBeUndefined();
    expect(store.snapshot_sess_200).toBeDefined();
  });

  test("handles deleting non-existent session gracefully", async () => {
    await browser.storage.local.set({ snapshot_index: [] });
    const result = await deleteSession("sess_nonexistent");
    expect(result.success).toBe(true);
  });
});

describe("background: renameSession", () => {
  beforeEach(() => {
    resetBrowserMocks();
  });

  test("renames session and updates timestamp", async () => {
    const originalTime = Date.now() - 10000;
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: {
        id: "sess_100",
        name: "Old Name",
        updatedAt: originalTime,
      },
    });

    const result = await renameSession("sess_100", "New Name");

    expect(result.success).toBe(true);
    expect(result.session.name).toBe("New Name");
    expect(result.session.updatedAt).toBeGreaterThan(originalTime);
  });

  test("deduplicates name on rename", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100", "sess_200"],
      snapshot_sess_100: { id: "sess_100", name: "A" },
      snapshot_sess_200: { id: "sess_200", name: "B" },
    });

    const result = await renameSession("sess_200", "A");

    expect(result.success).toBe(true);
    expect(result.session.name).toBe("A (2)");
  });

  test("fails for non-existent session", async () => {
    const result = await renameSession("sess_nonexistent", "Name");
    expect(result.success).toBe(false);
  });

  test("fails for empty name after sanitization", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: { id: "sess_100", name: "A" },
    });
    const result = await renameSession("sess_100", "   ");
    expect(result.success).toBe(false);
  });
});

describe("background: updateSession", () => {
  beforeEach(() => {
    resetBrowserMocks();
    browser.windows.getCurrent.mockResolvedValue({
      id: 5,
      tabs: [
        {
          id: 301,
          index: 0,
          url: "https://new-url.com",
          title: "New",
          favIconUrl: null,
          active: true,
          pinned: false,
        },
      ],
    });
    browser.tabs.sendMessage.mockResolvedValue({ x: 0, y: 0 });
  });

  test("overwrites tabs but keeps name and color", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: {
        id: "sess_100",
        name: "Keep This",
        color: "#1a7f37",
        createdAt: 1000,
        updatedAt: 1000,
        windowId: 1,
        tabs: [{ url: "https://old.com" }],
        tabCount: 1,
      },
    });

    const result = await updateSession("sess_100");

    expect(result.success).toBe(true);
    expect(result.session.name).toBe("Keep This");
    expect(result.session.color).toBe("#1a7f37");
    expect(result.session.tabs[0].url).toBe("https://new-url.com");
    expect(result.session.updatedAt).toBeGreaterThan(1000);
    expect(result.session.createdAt).toBe(1000);
  });

  test("fails for non-existent session", async () => {
    const result = await updateSession("sess_nonexistent");
    expect(result.success).toBe(false);
  });
});

describe("background: restoreSession", () => {
  beforeEach(() => {
    resetBrowserMocks();
    browser.windows.create.mockResolvedValue({
      id: 99,
      tabs: [{ id: 501 }],
    });
    browser.tabs.create.mockImplementation(async (opts) => ({
      id: 500 + Math.floor(Math.random() * 1000),
      ...opts,
    }));
  });

  test("creates new window with first non-pinned tab", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: {
        id: "sess_100",
        name: "Test",
        tabs: [
          {
            index: 0,
            url: "https://pinned.com",
            pinned: true,
            active: false,
            scrollX: 0,
            scrollY: 0,
          },
          {
            index: 1,
            url: "https://normal.com",
            pinned: false,
            active: true,
            scrollX: 0,
            scrollY: 0,
          },
        ],
      },
    });

    const result = await restoreSession("sess_100");

    expect(result.success).toBe(true);
    expect(browser.windows.create).toHaveBeenCalledWith({
      url: "https://normal.com",
      focused: true,
    });
  });

  test("opens remaining tabs in order", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: {
        id: "sess_100",
        name: "Test",
        tabs: [
          {
            index: 0,
            url: "https://first.com",
            pinned: false,
            active: true,
            scrollX: 0,
            scrollY: 0,
          },
          {
            index: 1,
            url: "https://second.com",
            pinned: false,
            active: false,
            scrollX: 0,
            scrollY: 0,
          },
          {
            index: 2,
            url: "https://third.com",
            pinned: true,
            active: false,
            scrollX: 0,
            scrollY: 0,
          },
        ],
      },
    });

    await restoreSession("sess_100");

    // First tab opened via windows.create, remaining 2 via tabs.create
    expect(browser.tabs.create).toHaveBeenCalledTimes(2);
    const calls = browser.tabs.create.mock.calls;
    expect(calls[0][0].url).toBe("https://second.com");
    expect(calls[1][0].url).toBe("https://third.com");
    expect(calls[1][0].pinned).toBe(true);
  });

  test("stores pending scroll map for tab restoration", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: {
        id: "sess_100",
        name: "Test",
        tabs: [
          { index: 0, url: "https://a.com", pinned: false, active: true, scrollX: 0, scrollY: 500 },
        ],
      },
    });

    await restoreSession("sess_100");

    const store = browser.storage._getStore();
    const scrollMap = store.snapshot_pending_scroll;
    expect(scrollMap).toBeDefined();
    const tabIds = Object.keys(scrollMap);
    expect(tabIds).toHaveLength(1);
    expect(scrollMap[tabIds[0]]).toEqual({ x: 0, y: 500 });
  });

  test("updates windowId in stored session", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: {
        id: "sess_100",
        name: "Test",
        windowId: 1,
        tabs: [
          { index: 0, url: "https://a.com", pinned: false, active: true, scrollX: 0, scrollY: 0 },
        ],
      },
    });

    await restoreSession("sess_100");

    const store = browser.storage._getStore();
    expect(store.snapshot_sess_100.windowId).toBe(99);
  });

  test("fails for non-existent session", async () => {
    const result = await restoreSession("sess_nonexistent");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("background: auto-sync tracked windows", () => {
  beforeEach(() => {
    resetBrowserMocks();
  });

  test("getTrackedWindows returns empty object when none tracked", async () => {
    const tracked = await getTrackedWindows();
    expect(tracked).toEqual({});
  });

  test("trackWindow persists windowId-to-sessionId mapping", async () => {
    await trackWindow(42, "sess_100");

    const tracked = await getTrackedWindows();
    expect(tracked[42]).toBe("sess_100");
  });

  test("untrackWindow removes window from tracked map", async () => {
    await trackWindow(42, "sess_100");
    await trackWindow(43, "sess_200");
    await untrackWindow(42);

    const tracked = await getTrackedWindows();
    expect(tracked[42]).toBeUndefined();
    expect(tracked[43]).toBe("sess_200");
  });

  test("untrackSessionWindows removes all windows for a session", async () => {
    await trackWindow(42, "sess_100");
    await trackWindow(43, "sess_100");
    await trackWindow(44, "sess_200");
    await untrackSessionWindows("sess_100");

    const tracked = await getTrackedWindows();
    expect(tracked[42]).toBeUndefined();
    expect(tracked[43]).toBeUndefined();
    expect(tracked[44]).toBe("sess_200");
  });

  test("restoreSession starts tracking the new window", async () => {
    browser.windows.create.mockResolvedValue({
      id: 99,
      tabs: [{ id: 501 }],
    });

    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: {
        id: "sess_100",
        name: "Test",
        tabs: [
          { index: 0, url: "https://a.com", pinned: false, active: true, scrollX: 0, scrollY: 0 },
        ],
      },
    });

    await restoreSession("sess_100");

    const tracked = await getTrackedWindows();
    expect(tracked[99]).toBe("sess_100");
  });

  test("deleteSession removes tracked windows for that session", async () => {
    await trackWindow(42, "sess_100");
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: { id: "sess_100", name: "Test" },
    });

    await deleteSession("sess_100");

    const tracked = await getTrackedWindows();
    expect(tracked[42]).toBeUndefined();
  });
});

describe("background: syncTrackedWindow", () => {
  beforeEach(() => {
    resetBrowserMocks();
  });

  test("updates session tabs from window state", async () => {
    const session = {
      id: "sess_100",
      name: "Test",
      color: "#0969da",
      createdAt: 1000,
      updatedAt: 1000,
      windowId: 42,
      tabs: [{ url: "https://old.com", index: 0 }],
      tabCount: 1,
    };
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: session,
    });
    await trackWindow(42, "sess_100");

    browser.windows.get.mockResolvedValue({
      id: 42,
      tabs: [
        { id: 301, index: 0, url: "https://new.com", title: "New", active: true, pinned: false },
        {
          id: 302,
          index: 1,
          url: "https://another.com",
          title: "Another",
          active: false,
          pinned: false,
        },
      ],
    });

    await syncTrackedWindow(42);

    const store = browser.storage._getStore();
    const updated = store.snapshot_sess_100;
    expect(updated.tabs).toHaveLength(2);
    expect(updated.tabs[0].url).toBe("https://new.com");
    expect(updated.tabs[1].url).toBe("https://another.com");
    expect(updated.tabCount).toBe(2);
    expect(updated.updatedAt).toBeGreaterThan(1000);
    // Preserves name and color
    expect(updated.name).toBe("Test");
    expect(updated.color).toBe("#0969da");
  });

  test("untracks window if session no longer exists", async () => {
    await trackWindow(42, "sess_nonexistent");

    await syncTrackedWindow(42);

    const tracked = await getTrackedWindows();
    expect(tracked[42]).toBeUndefined();
  });

  test("skips sync for untracked window", async () => {
    await syncTrackedWindow(999);
    // No error thrown, no storage calls beyond getTrackedWindows
    expect(browser.windows.get).not.toHaveBeenCalled();
  });

  test("untracks window when windows.get throws (window closed)", async () => {
    await trackWindow(42, "sess_100");
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: { id: "sess_100", name: "Test", tabs: [], tabCount: 0 },
    });
    browser.windows.get.mockRejectedValue(new Error("Invalid window ID"));

    await syncTrackedWindow(42);

    const tracked = await getTrackedWindows();
    expect(tracked[42]).toBeUndefined();
  });

  test("excludes about: tabs from synced session", async () => {
    await trackWindow(42, "sess_100");
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: { id: "sess_100", name: "Test", tabs: [], tabCount: 0, updatedAt: 1000 },
    });

    browser.windows.get.mockResolvedValue({
      id: 42,
      tabs: [
        {
          id: 301,
          index: 0,
          url: "https://valid.com",
          title: "Valid",
          active: true,
          pinned: false,
        },
        { id: 302, index: 1, url: "about:newtab", title: "New Tab", active: false, pinned: false },
      ],
    });

    await syncTrackedWindow(42);

    const store = browser.storage._getStore();
    expect(store.snapshot_sess_100.tabs).toHaveLength(1);
    expect(store.snapshot_sess_100.tabs[0].url).toBe("https://valid.com");
  });
});

describe("background: buildTabsFromWindow", () => {
  beforeEach(() => {
    resetBrowserMocks();
  });

  test("builds tab array excluding internal URLs", async () => {
    browser.windows.get.mockResolvedValue({
      id: 10,
      tabs: [
        { id: 1, index: 0, url: "https://example.com", title: "Ex", active: true, pinned: false },
        { id: 2, index: 1, url: "about:blank", title: "Blank", active: false, pinned: false },
      ],
    });

    const tabs = await buildTabsFromWindow(10);
    expect(tabs).toHaveLength(1);
    expect(tabs[0].url).toBe("https://example.com");
    expect(tabs[0].scrollX).toBe(0);
    expect(tabs[0].scrollY).toBe(0);
  });
});

describe("background: listener registration", () => {
  const listenerCounts = {
    onMessage: browser.runtime.onMessage.addListener.mock.calls.length,
    onUpdated: browser.tabs.onUpdated.addListener.mock.calls.length,
    onCreated: browser.tabs.onCreated.addListener.mock.calls.length,
    onRemoved: browser.tabs.onRemoved.addListener.mock.calls.length,
    onCommand: browser.commands.onCommand.addListener.mock.calls.length,
    windowsOnRemoved: browser.windows.onRemoved.addListener.mock.calls.length,
  };

  test("registers message listener on load", () => {
    expect(listenerCounts.onMessage).toBeGreaterThanOrEqual(1);
  });

  test("registers tabs.onUpdated listener for scroll restore and auto-sync", () => {
    expect(listenerCounts.onUpdated).toBeGreaterThanOrEqual(1);
  });

  test("registers tabs.onCreated listener for auto-sync", () => {
    expect(listenerCounts.onCreated).toBeGreaterThanOrEqual(1);
  });

  test("registers tabs.onRemoved listener for auto-sync", () => {
    expect(listenerCounts.onRemoved).toBeGreaterThanOrEqual(1);
  });

  test("registers windows.onRemoved listener for cleanup", () => {
    expect(listenerCounts.windowsOnRemoved).toBeGreaterThanOrEqual(1);
  });

  test("registers commands listener for keyboard shortcuts", () => {
    expect(listenerCounts.onCommand).toBeGreaterThanOrEqual(1);
  });
});

// === NEW FEATURE TESTS ===

describe("validation: tag sanitization", () => {
  test("sanitizeTag trims and lowercases", () => {
    expect(sanitizeTag("  Lavoro  ")).toBe("lavoro");
  });

  test("sanitizeTag truncates to max length", () => {
    const longTag = "a".repeat(30);
    expect(sanitizeTag(longTag).length).toBe(MAX_TAG_LENGTH);
  });

  test("sanitizeTag rejects invalid characters", () => {
    expect(sanitizeTag("<script>")).toBe("");
    expect(sanitizeTag("tag;drop")).toBe("");
  });

  test("sanitizeTag accepts accented characters", () => {
    expect(sanitizeTag("progettò")).toBe("progettò");
    expect(sanitizeTag("café")).toBe("café");
  });

  test("sanitizeTag returns empty for non-string", () => {
    expect(sanitizeTag(null)).toBe("");
    expect(sanitizeTag(123)).toBe("");
  });

  test("sanitizeTags deduplicates and limits to max", () => {
    const tags = ["a", "b", "a", "c", "d", "e", "f"];
    const result = sanitizeTags(tags);
    expect(result).toEqual(["a", "b", "c", "d", "e"]);
  });

  test("sanitizeTags filters invalid tags", () => {
    const tags = ["valid", "<bad>", "ok", null, "fine"];
    const result = sanitizeTags(tags);
    expect(result).toEqual(["valid", "ok", "fine"]);
  });

  test("sanitizeTags returns empty array for non-array", () => {
    expect(sanitizeTags(null)).toEqual([]);
    expect(sanitizeTags("string")).toEqual([]);
  });
});

describe("session-crud: saveSession with tags", () => {
  beforeEach(() => {
    resetBrowserMocks();
    browser.windows.getCurrent.mockResolvedValue({
      id: 1,
      tabs: [
        {
          id: 101,
          index: 0,
          url: "https://example.com",
          title: "Example",
          favIconUrl: null,
          active: true,
          pinned: false,
        },
      ],
    });
    browser.tabs.sendMessage.mockResolvedValue({ x: 0, y: 0 });
  });

  test("saves session with tags", async () => {
    const result = await saveSession("Tagged", "#0969da", ["work", "urgent"]);
    expect(result.success).toBe(true);
    expect(result.session.tags).toEqual(["work", "urgent"]);
  });

  test("sanitizes invalid tags on save", async () => {
    const result = await saveSession("Test", null, ["valid", "<bad>", null]);
    expect(result.session.tags).toEqual(["valid"]);
  });

  test("saves empty tags array when none provided", async () => {
    const result = await saveSession("Test", null, []);
    expect(result.session.tags).toEqual([]);
  });
});

describe("session-crud: updateSessionTags", () => {
  beforeEach(() => {
    resetBrowserMocks();
  });

  test("updates tags on existing session", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: {
        id: "sess_100",
        name: "Test",
        tags: ["old"],
        updatedAt: 1000,
      },
    });

    const result = await updateSessionTags("sess_100", ["new", "tags"]);
    expect(result.success).toBe(true);
    expect(result.session.tags).toEqual(["new", "tags"]);
    expect(result.session.updatedAt).toBeGreaterThan(1000);
  });

  test("fails for non-existent session", async () => {
    const result = await updateSessionTags("sess_999", ["tag"]);
    expect(result.success).toBe(false);
  });
});

describe("background: deferred delete", () => {
  beforeEach(() => {
    resetBrowserMocks();
  });

  test("scheduleDelete returns success immediately", () => {
    const result = scheduleDelete("sess_100");
    expect(result.success).toBe(true);
    // Cleanup: cancel the scheduled timer
    cancelDelete("sess_100");
  });

  test("cancelDelete returns success", () => {
    scheduleDelete("sess_100");
    const result = cancelDelete("sess_100");
    expect(result.success).toBe(true);
  });

  test("cancelDelete is idempotent (no error if no pending delete)", () => {
    const result = cancelDelete("sess_nonexistent");
    expect(result.success).toBe(true);
  });

  test("scheduleDelete registers a pending timer entry", () => {
    scheduleDelete("sess_100");
    // The pendingDeletes map should have an entry
    expect(pendingDeletes["sess_100"]).toBeDefined();
    cancelDelete("sess_100");
  });

  test("cancelDelete removes the pending timer entry", () => {
    scheduleDelete("sess_100");
    cancelDelete("sess_100");
    expect(pendingDeletes["sess_100"]).toBeUndefined();
  });

  test("re-scheduling replaces the previous timer", () => {
    scheduleDelete("sess_100");
    const firstTimer = pendingDeletes["sess_100"];

    scheduleDelete("sess_100");
    const secondTimer = pendingDeletes["sess_100"];

    // Timer IDs should be different (old was cleared, new was created)
    expect(secondTimer).not.toBe(firstTimer);
    cancelDelete("sess_100");
  });

  test("deleteSession is called after timeout expires", (done) => {
    browser.storage.local
      .set({
        snapshot_index: ["sess_100"],
        snapshot_sess_100: { id: "sess_100", name: "Test" },
      })
      .then(() => {
        // Manually create a short-delay delete to test the mechanism
        pendingDeletes["sess_100"] = setTimeout(async () => {
          delete pendingDeletes["sess_100"];
          await deleteSession("sess_100");

          const store = browser.storage._getStore();
          expect(store.snapshot_index).toEqual([]);
          expect(store.snapshot_sess_100).toBeUndefined();
          done();
        }, 50);
      });
  });
});

describe("export-import: exportSessions", () => {
  beforeEach(() => {
    resetBrowserMocks();
  });

  test("exports all sessions with correct format", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: {
        id: "sess_100",
        name: "Export Test",
        createdAt: 1000,
        updatedAt: 2000,
        color: "#0969da",
        tags: ["work"],
        windowId: 1,
        tabs: [
          {
            index: 0,
            url: "https://example.com",
            title: "Example",
            favIconUrl: null,
            active: true,
            pinned: false,
            scrollX: 0,
            scrollY: 100,
          },
        ],
        tabCount: 1,
      },
    });

    const result = await exportSessions();

    expect(result.version).toBe(1);
    expect(result.exportedAt).toBeDefined();
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].name).toBe("Export Test");
    expect(result.sessions[0].tabs[0].url).toBe("https://example.com");
    // Internal fields should be stripped
    expect(result.sessions[0].id).toBeUndefined();
    expect(result.sessions[0].windowId).toBeUndefined();
    expect(result.sessions[0].tabCount).toBeUndefined();
  });

  test("exports empty array when no sessions", async () => {
    const result = await exportSessions();
    expect(result.sessions).toEqual([]);
  });
});

describe("export-import: exportSingleSession", () => {
  beforeEach(() => {
    resetBrowserMocks();
  });

  test("exports a single session", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: {
        id: "sess_100",
        name: "Single",
        createdAt: 1000,
        updatedAt: 2000,
        color: "#0969da",
        tags: [],
        tabs: [{ url: "https://a.com", title: "A", pinned: false, scrollX: 0, scrollY: 0 }],
      },
    });

    const result = await exportSingleSession("sess_100");
    expect(result.success).toBe(true);
    expect(result.data.sessions).toHaveLength(1);
    expect(result.data.sessions[0].name).toBe("Single");
  });

  test("fails for non-existent session", async () => {
    const result = await exportSingleSession("sess_999");
    expect(result.success).toBe(false);
  });
});

describe("export-import: importSessions", () => {
  beforeEach(() => {
    resetBrowserMocks();
  });

  test("imports valid JSON with sessions", async () => {
    const data = {
      version: 1,
      sessions: [
        {
          name: "Imported",
          createdAt: 1000,
          color: "#1a7f37",
          tags: ["import"],
          tabs: [{ url: "https://example.com", title: "Ex", pinned: false }],
        },
      ],
    };

    const result = await importSessions(JSON.stringify(data));

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);

    const store = browser.storage._getStore();
    const index = store.snapshot_index;
    expect(index).toHaveLength(1);

    const session = store[`snapshot_${index[0]}`];
    expect(session.name).toBe("Imported");
    expect(session.tags).toEqual(["import"]);
    expect(session.tabs[0].url).toBe("https://example.com");
  });

  test("rejects invalid JSON", async () => {
    const result = await importSessions("not json");
    expect(result.success).toBe(false);
    expect(result.error).toContain("JSON");
  });

  test("rejects data without sessions array", async () => {
    const result = await importSessions(JSON.stringify({ foo: "bar" }));
    expect(result.success).toBe(false);
  });

  test("rejects empty sessions array", async () => {
    const result = await importSessions(JSON.stringify({ sessions: [] }));
    expect(result.success).toBe(false);
  });

  test("skips sessions with no valid tabs", async () => {
    const data = {
      sessions: [
        {
          name: "No tabs",
          tabs: [{ url: "javascript:alert(1)", title: "Bad" }],
        },
      ],
    };

    const result = await importSessions(JSON.stringify(data));
    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
  });

  test("deduplicates names on import", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100"],
      snapshot_sess_100: { id: "sess_100", name: "My Session" },
    });

    const data = {
      sessions: [
        {
          name: "My Session",
          tabs: [{ url: "https://example.com", title: "Ex" }],
        },
      ],
    };

    const result = await importSessions(JSON.stringify(data));
    expect(result.success).toBe(true);

    const store = browser.storage._getStore();
    const index = store.snapshot_index;
    const imported = store[`snapshot_${index[0]}`];
    expect(imported.name).toBe("My Session (2)");
  });

  test("sanitizes imported tags", async () => {
    const data = {
      sessions: [
        {
          name: "Tagged",
          tags: ["valid", "<script>", "ok"],
          tabs: [{ url: "https://example.com", title: "Ex" }],
        },
      ],
    };

    const result = await importSessions(JSON.stringify(data));
    expect(result.success).toBe(true);

    const store = browser.storage._getStore();
    const index = store.snapshot_index;
    const session = store[`snapshot_${index[0]}`];
    expect(session.tags).toEqual(["valid", "ok"]);
  });

  test("generates unique IDs for imported sessions", async () => {
    const data = {
      sessions: [
        {
          name: "A",
          tabs: [{ url: "https://a.com", title: "A" }],
        },
        {
          name: "B",
          tabs: [{ url: "https://b.com", title: "B" }],
        },
      ],
    };

    const result = await importSessions(JSON.stringify(data));
    expect(result.count).toBe(2);

    const store = browser.storage._getStore();
    const index = store.snapshot_index;
    expect(new Set(index).size).toBe(2);
  });
});

describe("export-import: round-trip", () => {
  beforeEach(() => {
    resetBrowserMocks();
    browser.windows.getCurrent.mockResolvedValue({
      id: 1,
      tabs: [
        {
          id: 101,
          index: 0,
          url: "https://example.com",
          title: "Example",
          favIconUrl: "https://example.com/fav.ico",
          active: true,
          pinned: false,
        },
      ],
    });
    browser.tabs.sendMessage.mockResolvedValue({ x: 0, y: 250 });
  });

  test("export then import preserves session data", async () => {
    await saveSession("Round Trip", "#6e40c9", ["test", "roundtrip"]);

    const exported = await exportSessions();
    const exportJson = JSON.stringify(exported);

    // Clear storage
    resetBrowserMocks();

    const result = await importSessions(exportJson);
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);

    const store = browser.storage._getStore();
    const index = store.snapshot_index;
    const session = store[`snapshot_${index[0]}`];

    expect(session.name).toBe("Round Trip");
    expect(session.color).toBe("#6e40c9");
    expect(session.tags).toEqual(["test", "roundtrip"]);
    expect(session.tabs[0].url).toBe("https://example.com");
    expect(session.tabs[0].scrollY).toBe(250);
  });
});

describe("export-import: getStorageStats", () => {
  beforeEach(() => {
    resetBrowserMocks();
  });

  test("returns bytes used and session count", async () => {
    await browser.storage.local.set({
      snapshot_index: ["sess_100", "sess_200"],
      snapshot_sess_100: { id: "sess_100", name: "A" },
      snapshot_sess_200: { id: "sess_200", name: "B" },
    });

    const stats = await getStorageStats();

    expect(stats.bytesUsed).toBeGreaterThan(0);
    expect(stats.sessionCount).toBe(2);
  });

  test("returns zero for empty storage", async () => {
    const stats = await getStorageStats();
    expect(stats.sessionCount).toBe(0);
    expect(stats.bytesUsed).toBeGreaterThan(0); // Empty JSON {} still has size
  });
});

describe("validation: session ID patterns", () => {
  test("accepts standard session IDs", () => {
    expect(isValidSessionId("sess_1234567890")).toBe(true);
  });

  test("accepts import-generated session IDs", () => {
    expect(isValidSessionId("sess_1234567890_abc123")).toBe(true);
  });

  test("rejects malformed import IDs", () => {
    expect(isValidSessionId("sess_123_")).toBe(false);
    expect(isValidSessionId("sess_abc_def")).toBe(false);
    expect(isValidSessionId("sess__abc")).toBe(false);
  });
});
