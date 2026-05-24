// Session Snapshot - Popup UI (core)
// Session list, save form, color picker, language switcher.
// Depends on: ui-utils.js, toast.js, search.js, tags.js, export-import.js,
//             context-menu.js, inline-rename.js

let selectedColor = null;
let cachedSessions = [];

// --- Initialization ---

document.addEventListener("DOMContentLoaded", async () => {
  const dictionaries = await I18N_DICTIONARIES_PROMISE;
  await i18nInit(dictionaries);
  translatePage();
  initLangSwitcher();
  renderColorPicker();
  await loadSessions();
  await loadStorageStats();
  bindEvents();
  initSearch();
});

// --- Refresh helper (shared callback for child modules) ---

async function refreshAll() {
  await loadSessions();
  await loadStorageStats();
}

// --- Session loading and rendering ---

async function loadSessions() {
  const response = await browser.runtime.sendMessage({ action: "get-sessions" });
  cachedSessions = response.sessions || [];

  const list = document.getElementById("ss-sessions-list");
  const empty = document.getElementById("ss-empty-state");
  const count = document.getElementById("ss-sessions-count");

  if (cachedSessions.length === 0) {
    list.classList.add("hidden");
    list.innerHTML = "";
    empty.classList.remove("hidden");
    count.textContent = t("sessions.empty");
    return;
  }

  count.textContent = t("sessions.count", { count: cachedSessions.length });
  list.innerHTML = cachedSessions.map(renderSession).join("");
  applySessionColors(list);
  list.classList.remove("hidden");
  empty.classList.add("hidden");
  openMenuId = null;

  filterSessionList();
}

function applySessionColors(container) {
  container.querySelectorAll(".ss-session-color[data-color]").forEach((dot) => {
    dot.style.backgroundColor = dot.dataset.color;
  });
}

function renderSession(session) {
  const age = formatAge(session.updatedAt);
  const tags = (session.tags || [])
    .map((tag) => `<span class="ss-tag-pill">${escapeHtml(tag)}</span>`)
    .join("");
  const tagsHtml = tags ? `<div class="ss-session-tags">${tags}</div>` : "";

  return `
    <div class="ss-session-item" data-id="${session.id}">
      <div class="ss-session-color" data-color="${safeColor(session.color)}"></div>
      <div class="ss-session-info">
        <div class="ss-session-name">${escapeHtml(session.name)}</div>
        <div class="ss-session-meta">
          ${t("session.tabs", { count: session.tabCount })} &middot; ${age}
        </div>
        ${tagsHtml}
      </div>
      <div class="ss-session-actions">
        <button class="ss-restore-btn" data-id="${session.id}" title="${t("session.restore_title")}">
          &#9654;
        </button>
        <button class="ss-menu-btn" data-id="${session.id}" title="${t("session.options_title")}">
          &#8942;
        </button>
      </div>
    </div>
  `;
}

// --- Color picker ---

function renderColorPicker() {
  const picker = document.getElementById("ss-color-picker");
  picker.innerHTML = AUTO_COLORS.map(
    (color, i) =>
      `<div class="ss-color-dot${i === 0 ? " selected" : ""}"
          data-color="${color}"
          title="${color}"></div>`
  ).join("");
  picker.querySelectorAll(".ss-color-dot").forEach((dot) => {
    dot.style.backgroundColor = dot.dataset.color;
  });
  selectedColor = AUTO_COLORS[0];
}

function getSelectedColor() {
  return selectedColor;
}

// --- Event binding ---

function bindEvents() {
  document.getElementById("ss-save-btn").addEventListener("click", () => {
    document.getElementById("ss-save-collapsed").classList.add("hidden");
    document.getElementById("ss-save-expanded").classList.remove("hidden");
    document.getElementById("ss-session-name").focus();
  });

  document.getElementById("ss-save-cancel").addEventListener("click", resetSaveForm);

  document.getElementById("ss-save-confirm").addEventListener("click", async () => {
    const name = document.getElementById("ss-session-name").value.trim();
    const color = getSelectedColor();
    try {
      await browser.runtime.sendMessage({
        action: "save-session",
        name,
        color,
        tags: getSaveTags(),
      });
    } catch (err) {
      console.error("Session Snapshot: save failed -", err);
    }
    resetSaveForm();
    await refreshAll();
  });

  document.getElementById("ss-session-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("ss-save-confirm").click();
    if (e.key === "Escape") document.getElementById("ss-save-cancel").click();
  });

  document.getElementById("ss-color-picker").addEventListener("click", (e) => {
    const dot = e.target.closest(".ss-color-dot");
    if (!dot) return;
    document.querySelectorAll(".ss-color-dot").forEach((d) => d.classList.remove("selected"));
    dot.classList.add("selected");
    selectedColor = dot.dataset.color;
  });

  initSaveTagEvents();

  document.getElementById("ss-sessions-list").addEventListener("click", async (e) => {
    const restoreBtn = e.target.closest(".ss-restore-btn");
    const menuBtn = e.target.closest(".ss-menu-btn");

    if (restoreBtn) {
      await browser.runtime.sendMessage({
        action: "restore-session",
        sessionId: restoreBtn.dataset.id,
      });
      window.close();
      return;
    }

    if (menuBtn) {
      toggleContextMenu(menuBtn.dataset.id);
    }
  });

  document.addEventListener("click", async (e) => {
    const menuItem = e.target.closest(".ss-menu-item");
    if (menuItem) {
      const contextMenu = menuItem.closest(".ss-context-menu");
      await handleMenuAction(menuItem.dataset.action, contextMenu.dataset.id);
      return;
    }

    if (openMenuId && !e.target.closest(".ss-context-menu") && !e.target.closest(".ss-menu-btn")) {
      closeContextMenu();
    }
  });

  document.getElementById("ss-export-btn").addEventListener("click", handleExport);
  document.getElementById("ss-import-input").addEventListener("change", (e) => {
    handleImport(e, refreshAll);
  });

  initTagEditorEvents(refreshAll);
}

// --- Save form reset ---

function resetSaveForm() {
  document.getElementById("ss-save-collapsed").classList.remove("hidden");
  document.getElementById("ss-save-expanded").classList.add("hidden");
  document.getElementById("ss-session-name").value = "";
  resetSaveTags();
  renderColorPicker();
}

// --- Language switcher ---

function initLangSwitcher() {
  const switcher = document.getElementById("ss-lang-switcher");
  updateLangButtons();

  switcher.addEventListener("click", async (e) => {
    const btn = e.target.closest(".ss-lang-btn");
    if (!btn) return;

    const lang = btn.dataset.lang;
    if (lang === i18nGetLang()) return;

    await i18nSetLang(lang);
    translatePage();
    updateLangButtons();
    await loadSessions();
    await loadStorageStats();
  });
}

function updateLangButtons() {
  const currentLang = i18nGetLang();
  document.querySelectorAll(".ss-lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
  document.documentElement.lang = currentLang;
}
