// Session Snapshot - Popup UI
// Handles session list rendering, save form, context menu, and inline rename.

const AUTO_COLORS = [
  "#0969da", "#1a7f37", "#9a3412", "#6e40c9",
  "#b45309", "#0e7490", "#be185d", "#374151",
];

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

let selectedColor = null;
let openMenuId = null;

function safeColor(color) {
  return HEX_COLOR_PATTERN.test(color) ? color : "#374151";
}

// --- Initialization ---

document.addEventListener("DOMContentLoaded", async () => {
  renderColorPicker();
  await loadSessions();
  bindEvents();
});

// --- Session loading and rendering ---

async function loadSessions() {
  const response = await browser.runtime.sendMessage({ action: "get-sessions" });
  const sessions = response.sessions || [];

  const list = document.getElementById("ss-sessions-list");
  const empty = document.getElementById("ss-empty-state");
  const count = document.getElementById("ss-sessions-count");

  if (sessions.length === 0) {
    list.classList.add("hidden");
    list.innerHTML = "";
    empty.classList.remove("hidden");
    count.textContent = "Nessuna sessione";
    return;
  }

  count.textContent = `Le tue sessioni (${sessions.length})`;
  list.innerHTML = sessions.map(renderSession).join("");
  // Apply colors via JS to avoid inline styles (blocked by CSP style-src 'self')
  list.querySelectorAll(".ss-session-color[data-color]").forEach((dot) => {
    dot.style.backgroundColor = dot.dataset.color;
  });
  list.classList.remove("hidden");
  empty.classList.add("hidden");
  openMenuId = null;
}

function renderSession(session) {
  const age = formatAge(session.updatedAt);
  return `
    <div class="ss-session-item" data-id="${session.id}">
      <div class="ss-session-color" data-color="${safeColor(session.color)}"></div>
      <div class="ss-session-info">
        <div class="ss-session-name">${escapeHtml(session.name)}</div>
        <div class="ss-session-meta">
          ${session.tabCount} schede &middot; ${age}
        </div>
      </div>
      <div class="ss-session-actions">
        <button class="ss-restore-btn" data-id="${session.id}" title="Ripristina in nuova finestra">
          &#9654;
        </button>
        <button class="ss-menu-btn" data-id="${session.id}" title="Opzioni">
          &#8942;
        </button>
      </div>
    </div>
  `;
}

// --- Color picker ---

function renderColorPicker() {
  const picker = document.getElementById("ss-color-picker");
  picker.innerHTML = AUTO_COLORS.map((color, i) =>
    `<div class="ss-color-dot${i === 0 ? " selected" : ""}"
          data-color="${color}"
          title="${color}"></div>`
  ).join("");
  // Apply colors via JS to avoid inline styles (CSP compliance)
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
  // Save form toggle
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
      await browser.runtime.sendMessage({ action: "save-session", name, color });
    } catch (err) {
      console.error("Session Snapshot: save failed -", err);
    }
    resetSaveForm();
    await loadSessions();
  });

  // Enter/Escape on name input
  document.getElementById("ss-session-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("ss-save-confirm").click();
    if (e.key === "Escape") document.getElementById("ss-save-cancel").click();
  });

  // Color picker delegation
  document.getElementById("ss-color-picker").addEventListener("click", (e) => {
    const dot = e.target.closest(".ss-color-dot");
    if (!dot) return;

    document.querySelectorAll(".ss-color-dot").forEach((d) => d.classList.remove("selected"));
    dot.classList.add("selected");
    selectedColor = dot.dataset.color;
  });

  // Session list delegation
  document.getElementById("ss-sessions-list").addEventListener("click", async (e) => {
    const restoreBtn = e.target.closest(".ss-restore-btn");
    const menuBtn = e.target.closest(".ss-menu-btn");
    const menuItem = e.target.closest(".ss-menu-item");

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
      return;
    }

    if (menuItem) {
      const contextMenu = menuItem.closest(".ss-context-menu");
      await handleMenuAction(menuItem.dataset.action, contextMenu.dataset.id);
      return;
    }

    // Click outside context menu closes it
    if (openMenuId && !e.target.closest(".ss-context-menu")) {
      closeContextMenu();
    }
  });

  // Close context menu on click outside
  document.addEventListener("click", (e) => {
    if (openMenuId && !e.target.closest(".ss-context-menu") && !e.target.closest(".ss-menu-btn")) {
      closeContextMenu();
    }
  });
}

// --- Save form reset ---

function resetSaveForm() {
  document.getElementById("ss-save-collapsed").classList.remove("hidden");
  document.getElementById("ss-save-expanded").classList.add("hidden");
  document.getElementById("ss-session-name").value = "";
  renderColorPicker();
}

// --- Context menu ---

function toggleContextMenu(sessionId) {
  if (openMenuId === sessionId) {
    closeContextMenu();
    return;
  }

  closeContextMenu();

  const item = document.querySelector(`.ss-session-item[data-id="${sessionId}"]`);
  if (!item) return;

  const menuBtn = item.querySelector(".ss-menu-btn");
  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderContextMenu(sessionId);
  const menuEl = wrapper.firstElementChild;
  document.body.appendChild(menuEl);

  // Position relative to the menu button
  const btnRect = menuBtn.getBoundingClientRect();
  const menuWidth = 200;
  let top = btnRect.bottom + 4;
  let left = btnRect.right - menuWidth;

  // Keep within popup bounds
  if (left < 4) left = 4;
  if (top + 160 > window.innerHeight) {
    top = btnRect.top - 160;
  }

  menuEl.style.top = `${top}px`;
  menuEl.style.left = `${left}px`;
  openMenuId = sessionId;
}

function renderContextMenu(sessionId) {
  return `
    <div class="ss-context-menu" data-id="${sessionId}">
      <button class="ss-menu-item" data-action="update">
        Aggiorna con schede correnti
      </button>
      <button class="ss-menu-item" data-action="rename">
        Rinomina
      </button>
      <hr />
      <button class="ss-menu-item ss-danger" data-action="delete">
        Elimina
      </button>
    </div>
  `;
}

function closeContextMenu() {
  const existing = document.querySelector(".ss-context-menu");
  if (existing) existing.remove();
  openMenuId = null;
}

// --- Menu actions ---

async function handleMenuAction(action, sessionId) {
  closeContextMenu();

  try {
    if (action === "update") {
      await browser.runtime.sendMessage({ action: "update-session", sessionId });
      await loadSessions();
    }

    if (action === "rename") {
      startInlineRename(sessionId);
    }

    if (action === "delete") {
      if (confirm("Eliminare questa sessione?")) {
        await browser.runtime.sendMessage({ action: "delete-session", sessionId });
        await loadSessions();
      }
    }
  } catch (err) {
    console.error("Session Snapshot: action failed -", err);
  }
}

// --- Inline rename ---

function startInlineRename(sessionId) {
  const item = document.querySelector(`.ss-session-item[data-id="${sessionId}"]`);
  if (!item) return;

  const nameEl = item.querySelector(".ss-session-name");
  const currentName = nameEl.textContent;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "ss-rename-input";
  input.value = currentName;
  input.maxLength = 50;

  nameEl.replaceWith(input);
  input.focus();
  input.select();

  let submitted = false;

  async function confirmRename() {
    if (submitted) return;
    submitted = true;
    const newName = input.value.trim();
    if (newName && newName !== currentName) {
      await browser.runtime.sendMessage({
        action: "rename-session",
        sessionId,
        name: newName,
      });
    }
    await loadSessions();
  }

  function cancelRename() {
    if (submitted) return;
    submitted = true;
    loadSessions();
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmRename();
    if (e.key === "Escape") cancelRename();
  });

  input.addEventListener("blur", confirmRename);
}

// --- Utilities ---

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatAge(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Salvata ora";
  if (minutes < 60) return `Salvata ${minutes} min fa`;
  if (hours < 24) {
    const time = new Date(timestamp).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `Salvata oggi, ${time}`;
  }
  if (days === 1) return "Salvata ieri";
  if (days < 7) return `Salvata ${days} giorni fa`;
  return `Salvata il ${new Date(timestamp).toLocaleDateString("it-IT")}`;
}
