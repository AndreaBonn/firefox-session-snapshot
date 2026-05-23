const fs = require("fs");
const path = require("path");
const { loadScript } = require("./helpers");

// Load popup HTML into jsdom before loading popup.js
const popupHtml = fs.readFileSync(
  path.resolve(__dirname, "../popup/popup.html"),
  "utf-8"
);

describe("popup: formatAge", () => {
  beforeAll(() => {
    document.documentElement.innerHTML = popupHtml;
    loadScript("popup/popup.js");
  });

  test("returns 'Salvata ora' for timestamp less than 1 minute ago", () => {
    const now = Date.now();
    expect(formatAge(now)).toBe("Salvata ora");
    expect(formatAge(now - 30000)).toBe("Salvata ora");
  });

  test("returns minutes for 1-59 minutes ago", () => {
    const fiveMinAgo = Date.now() - 5 * 60000;
    expect(formatAge(fiveMinAgo)).toBe("Salvata 5 min fa");

    const oneMinAgo = Date.now() - 60000;
    expect(formatAge(oneMinAgo)).toBe("Salvata 1 min fa");
  });

  test("returns 'oggi' with time for same day", () => {
    const threeHoursAgo = Date.now() - 3 * 3600000;
    const result = formatAge(threeHoursAgo);
    expect(result).toMatch(/^Salvata oggi, \d{2}:\d{2}$/);
  });

  test("returns 'ieri' for 1 day ago", () => {
    const yesterday = Date.now() - 86400000;
    expect(formatAge(yesterday)).toBe("Salvata ieri");
  });

  test("returns 'N giorni fa' for 2-6 days", () => {
    const threeDays = Date.now() - 3 * 86400000;
    expect(formatAge(threeDays)).toBe("Salvata 3 giorni fa");
  });

  test("returns date for 7+ days ago", () => {
    const tenDays = Date.now() - 10 * 86400000;
    const result = formatAge(tenDays);
    expect(result).toMatch(/^Salvata il \d{1,2}\/\d{1,2}\/\d{4}$/);
  });
});

describe("popup: escapeHtml", () => {
  test("escapes HTML special characters", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).not.toContain("<script>");
    expect(escapeHtml("a & b")).toContain("&amp;");
    // jsdom innerHTML doesn't encode quotes (they're safe in text nodes)
    expect(escapeHtml('"quotes"')).toContain("quotes");
  });

  test("returns plain text unchanged", () => {
    expect(escapeHtml("Progetto A")).toBe("Progetto A");
    expect(escapeHtml("test 123")).toBe("test 123");
  });

  test("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("popup: renderSession", () => {
  test("renders session item with correct data attributes", () => {
    const html = renderSession({
      id: "sess_100",
      name: "Progetto A",
      color: "#0969da",
      tabCount: 4,
      updatedAt: Date.now(),
    });

    expect(html).toContain('data-id="sess_100"');
    expect(html).toContain("Progetto A");
    expect(html).toContain("4 schede");
    expect(html).toContain('data-color="#0969da"');
  });

  test("escapes session name in rendered HTML", () => {
    const html = renderSession({
      id: "sess_100",
      name: '<img onerror="alert(1)">',
      color: "#000",
      tabCount: 1,
      updatedAt: Date.now(),
    });

    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  test("includes restore and menu buttons with session ID", () => {
    const html = renderSession({
      id: "sess_42",
      name: "Test",
      color: "#000",
      tabCount: 1,
      updatedAt: Date.now(),
    });

    expect(html).toContain('class="ss-restore-btn"');
    expect(html).toContain('class="ss-menu-btn"');
    expect(html).toContain('data-id="sess_42"');
  });
});

describe("popup: renderContextMenu", () => {
  test("renders menu with update, rename, and delete actions", () => {
    const html = renderContextMenu("sess_100");

    expect(html).toContain('data-action="update"');
    expect(html).toContain('data-action="rename"');
    expect(html).toContain('data-action="delete"');
    expect(html).toContain('data-id="sess_100"');
  });

  test("delete button has danger class", () => {
    const html = renderContextMenu("sess_100");
    expect(html).toContain("ss-danger");
  });
});

describe("popup: DOM interactions", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = popupHtml;
    resetBrowserMocks();
    // Re-initialize popup state
    openMenuId = null;
    selectedColor = null;
    renderColorPicker();
    bindEvents();
  });

  test("save button toggles form visibility", () => {
    const collapsed = document.getElementById("ss-save-collapsed");
    const expanded = document.getElementById("ss-save-expanded");

    expect(expanded.classList.contains("hidden")).toBe(true);

    document.getElementById("ss-save-btn").click();
    expect(collapsed.classList.contains("hidden")).toBe(true);
    expect(expanded.classList.contains("hidden")).toBe(false);
  });

  test("cancel button resets form", () => {
    document.getElementById("ss-save-btn").click();
    document.getElementById("ss-session-name").value = "Some name";
    document.getElementById("ss-save-cancel").click();

    const collapsed = document.getElementById("ss-save-collapsed");
    const expanded = document.getElementById("ss-save-expanded");
    expect(collapsed.classList.contains("hidden")).toBe(false);
    expect(expanded.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("ss-session-name").value).toBe("");
  });

  test("color picker renders 8 color dots", () => {
    const dots = document.querySelectorAll(".ss-color-dot");
    expect(dots).toHaveLength(8);
  });

  test("color picker selects color on click", () => {
    const dots = document.querySelectorAll(".ss-color-dot");
    dots[3].click();

    expect(dots[3].classList.contains("selected")).toBe(true);
    expect(dots[0].classList.contains("selected")).toBe(false);
    expect(getSelectedColor()).toBe(AUTO_COLORS[3]);
  });

  test("first color is selected by default", () => {
    expect(getSelectedColor()).toBe(AUTO_COLORS[0]);
    const firstDot = document.querySelector(".ss-color-dot");
    expect(firstDot.classList.contains("selected")).toBe(true);
  });

  test("loadSessions shows empty state when no sessions", async () => {
    browser.runtime.sendMessage.mockResolvedValue({ sessions: [] });
    await loadSessions();

    const empty = document.getElementById("ss-empty-state");
    const list = document.getElementById("ss-sessions-list");
    expect(empty.classList.contains("hidden")).toBe(false);
    expect(list.classList.contains("hidden")).toBe(true);
    expect(document.getElementById("ss-sessions-count").textContent).toBe(
      "Nessuna sessione"
    );
  });

  test("loadSessions renders session list", async () => {
    browser.runtime.sendMessage.mockResolvedValue({
      sessions: [
        {
          id: "sess_100",
          name: "Test A",
          color: "#0969da",
          tabCount: 3,
          updatedAt: Date.now(),
        },
        {
          id: "sess_200",
          name: "Test B",
          color: "#1a7f37",
          tabCount: 5,
          updatedAt: Date.now() - 86400000,
        },
      ],
    });
    await loadSessions();

    const items = document.querySelectorAll(".ss-session-item");
    expect(items).toHaveLength(2);
    expect(document.getElementById("ss-sessions-count").textContent).toBe(
      "Le tue sessioni (2)"
    );
  });
});
