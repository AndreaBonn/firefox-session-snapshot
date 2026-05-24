const fs = require("fs");
const path = require("path");
const { loadScript } = require("./helpers");

const popupHtml = fs.readFileSync(path.resolve(__dirname, "../popup/popup.html"), "utf-8");

describe("search: filterSessionList", () => {
  beforeAll(() => {
    document.documentElement.innerHTML = popupHtml;
    loadScript("shared/constants.js");
    loadScript("popup/ui-utils.js");
    loadScript("popup/toast.js");
    loadScript("popup/search.js");
    loadScript("popup/context-menu.js");
    loadScript("popup/inline-rename.js");
    loadScript("popup/popup.js");
  });

  beforeEach(() => {
    jest.useFakeTimers();
    resetBrowserMocks();
    currentSearchQuery = "";
    const input = document.getElementById("ss-search-input");
    if (input) input.value = "";
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function setupSessionItems() {
    const list = document.getElementById("ss-sessions-list");
    const sessions = [
      { id: "sess_1", name: "Progetto Alpha", tabCount: 3 },
      { id: "sess_2", name: "Progetto Beta", tabCount: 5 },
      { id: "sess_3", name: "Lavoro Importante", tabCount: 2 },
    ];
    list.replaceChildren(
      ...sessions.map((s) =>
        createSessionElement({ ...s, color: "#0969da", updatedAt: Date.now() })
      )
    );
    list.classList.remove("hidden");
  }

  test("shows all items when query is empty", () => {
    setupSessionItems();
    currentSearchQuery = "";
    filterSessionList();

    const visible = document.querySelectorAll(".ss-session-item:not(.hidden)");
    expect(visible).toHaveLength(3);
  });

  test("filters items by name (case-insensitive)", () => {
    setupSessionItems();
    currentSearchQuery = "alpha";
    filterSessionList();

    const visible = document.querySelectorAll(".ss-session-item:not(.hidden)");
    expect(visible).toHaveLength(1);
    expect(visible[0].querySelector(".ss-session-name").textContent).toBe("Progetto Alpha");
  });

  test("filters with partial match", () => {
    setupSessionItems();
    currentSearchQuery = "progetto";
    filterSessionList();

    const visible = document.querySelectorAll(".ss-session-item:not(.hidden)");
    expect(visible).toHaveLength(2);
  });

  test("shows no-results when no match found", () => {
    setupSessionItems();
    currentSearchQuery = "zzzznonexistent";
    filterSessionList();

    const visible = document.querySelectorAll(".ss-session-item:not(.hidden)");
    const noResults = document.getElementById("ss-no-results");
    expect(visible).toHaveLength(0);
    expect(noResults.classList.contains("hidden")).toBe(false);
  });

  test("hides no-results when matches exist", () => {
    setupSessionItems();
    currentSearchQuery = "alpha";
    filterSessionList();

    const noResults = document.getElementById("ss-no-results");
    expect(noResults.classList.contains("hidden")).toBe(true);
  });

  test("search input triggers filtering with debounce", () => {
    setupSessionItems();
    initSearch();

    const input = document.getElementById("ss-search-input");
    input.value = "beta";
    input.dispatchEvent(new Event("input"));

    // Before debounce: all visible
    const beforeDebounce = document.querySelectorAll(".ss-session-item:not(.hidden)");
    expect(beforeDebounce).toHaveLength(3);

    // After debounce
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 10);
    const afterDebounce = document.querySelectorAll(".ss-session-item:not(.hidden)");
    expect(afterDebounce).toHaveLength(1);
  });

  test("Escape key clears search", () => {
    setupSessionItems();
    initSearch();

    const input = document.getElementById("ss-search-input");
    input.value = "alpha";
    currentSearchQuery = "alpha";
    filterSessionList();

    expect(document.querySelectorAll(".ss-session-item:not(.hidden)")).toHaveLength(1);

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(input.value).toBe("");
    expect(document.querySelectorAll(".ss-session-item:not(.hidden)")).toHaveLength(3);
  });
});

describe("search: getSearchQuery", () => {
  test("returns current query value", () => {
    currentSearchQuery = "test";
    expect(getSearchQuery()).toBe("test");
  });

  test("returns empty string when no query", () => {
    currentSearchQuery = "";
    expect(getSearchQuery()).toBe("");
  });
});

describe("search: clearSearch", () => {
  test("resets query and input value", () => {
    const input = document.getElementById("ss-search-input");
    input.value = "something";
    currentSearchQuery = "something";

    clearSearch();

    expect(input.value).toBe("");
    expect(currentSearchQuery).toBe("");
  });
});
