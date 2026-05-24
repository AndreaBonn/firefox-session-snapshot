// Session Snapshot - Context menu
// Handles session context menu (update, rename, tags, export, delete).
// Depends on: ui-utils.js, toast.js, tags.js, export-import.js

let openMenuId = null;

function toggleContextMenu(sessionId) {
  if (openMenuId === sessionId) {
    closeContextMenu();
    return;
  }

  closeContextMenu();

  const item = document.querySelector(`.ss-session-item[data-id="${sessionId}"]`);
  if (!item) return;

  const menuBtn = item.querySelector(".ss-menu-btn");
  const menuEl = createContextMenu(sessionId);
  document.body.appendChild(menuEl);

  const btnRect = menuBtn.getBoundingClientRect();
  const menuHeight = menuEl.offsetHeight;
  const menuWidth = menuEl.offsetWidth;

  let top = btnRect.bottom + 2;
  let left = btnRect.right - menuWidth;

  if (top + menuHeight > window.innerHeight) {
    top = btnRect.top - menuHeight - 2;
  }
  if (left < 4) left = 4;

  menuEl.style.top = `${top}px`;
  menuEl.style.left = `${left}px`;
  openMenuId = sessionId;
}

function createContextMenu(sessionId) {
  const menu = document.createElement("div");
  menu.className = "ss-context-menu";
  menu.dataset.id = sessionId;

  const actions = [
    { action: "update", label: t("menu.update") },
    { action: "rename", label: t("menu.rename") },
    { action: "edit-tags", label: t("menu.edit_tags") },
    { action: "export-one", label: t("menu.export") },
  ];

  actions.forEach(({ action, label }) => {
    const btn = document.createElement("button");
    btn.className = "ss-menu-item";
    btn.dataset.action = action;
    btn.textContent = label;
    menu.appendChild(btn);
  });

  menu.appendChild(document.createElement("hr"));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "ss-menu-item ss-danger";
  deleteBtn.dataset.action = "delete";
  deleteBtn.textContent = t("menu.delete");
  menu.appendChild(deleteBtn);

  return menu;
}

function closeContextMenu() {
  const existing = document.querySelector(".ss-context-menu");
  if (existing) existing.remove();
  openMenuId = null;
}

async function handleMenuAction(action, sessionId) {
  closeContextMenu();

  try {
    if (action === "update") {
      await browser.runtime.sendMessage({ action: "update-session", sessionId });
      await refreshAll();
    }

    if (action === "rename") {
      startInlineRename(sessionId);
    }

    if (action === "edit-tags") {
      openTagEditor(sessionId, cachedSessions);
    }

    if (action === "export-one") {
      const result = await browser.runtime.sendMessage({
        action: "export-session",
        sessionId,
      });
      if (result.success) {
        downloadJson(result.data, `session-snapshot-${sessionId}.json`);
      }
    }

    if (action === "delete") {
      const session = cachedSessions.find((s) => s.id === sessionId);
      const sessionName = session ? session.name : "Sessione";

      cachedSessions = cachedSessions.filter((s) => s.id !== sessionId);
      const item = document.querySelector(`.ss-session-item[data-id="${sessionId}"]`);
      if (item) item.remove();
      updateSessionCount();

      await browser.runtime.sendMessage({ action: "schedule-delete", sessionId });

      showUndoToast(
        t("toast.deleted", { name: sessionName }),
        () => {},
        async () => {
          await browser.runtime.sendMessage({ action: "cancel-delete", sessionId });
          await refreshAll();
        }
      );
    }
  } catch (err) {
    console.error("Session Snapshot: action failed -", err);
  }
}

function updateSessionCount() {
  const count = document.getElementById("ss-sessions-count");
  if (cachedSessions.length <= 0) {
    count.textContent = t("sessions.empty");
  } else {
    count.textContent = t("sessions.count", { count: cachedSessions.length });
  }
}
