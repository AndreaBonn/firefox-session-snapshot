const { loadScript } = require("./helpers");

// Load scripts in manifest order - validation first, then background
loadScript("background/validation.js");
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
          id: 101, index: 0, url: "https://example.com",
          title: "Example", favIconUrl: "https://example.com/fav.ico",
          active: true, pinned: false,
        },
        {
          id: 102, index: 1, url: "https://github.com",
          title: "GitHub", favIconUrl: null,
          active: false, pinned: true,
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
        { id: 103, index: 2, url: "moz-extension://abc/popup.html", title: "Ext", active: false, pinned: false },
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
          id: 301, index: 0, url: "https://new-url.com",
          title: "New", favIconUrl: null, active: true, pinned: false,
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
          { index: 0, url: "https://pinned.com", pinned: true, active: false, scrollX: 0, scrollY: 0 },
          { index: 1, url: "https://normal.com", pinned: false, active: true, scrollX: 0, scrollY: 0 },
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
          { index: 0, url: "https://first.com", pinned: false, active: true, scrollX: 0, scrollY: 0 },
          { index: 1, url: "https://second.com", pinned: false, active: false, scrollX: 0, scrollY: 0 },
          { index: 2, url: "https://third.com", pinned: true, active: false, scrollX: 0, scrollY: 0 },
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

describe("background: listener registration", () => {
  // Listeners are registered at script load time (loadScript at top of file).
  // We capture the call counts immediately after load, before any beforeEach reset.
  const listenerCounts = {
    onMessage: browser.runtime.onMessage.addListener.mock.calls.length,
    onUpdated: browser.tabs.onUpdated.addListener.mock.calls.length,
    onCommand: browser.commands.onCommand.addListener.mock.calls.length,
  };

  test("registers message listener on load", () => {
    expect(listenerCounts.onMessage).toBeGreaterThanOrEqual(1);
  });

  test("registers tabs.onUpdated listener for scroll restore", () => {
    expect(listenerCounts.onUpdated).toBeGreaterThanOrEqual(1);
  });

  test("registers commands listener for keyboard shortcuts", () => {
    expect(listenerCounts.onCommand).toBeGreaterThanOrEqual(1);
  });
});
