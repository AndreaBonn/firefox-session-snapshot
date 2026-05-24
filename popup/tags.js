// Session Snapshot - Tag management UI
// Handles tag input in save form and tag editor modal.
// Depends on: ui-utils.js (loaded before this file)

let saveTags = [];
let tagEditorSessionId = null;
let tagEditorTags = [];

function getSaveTags() {
  return saveTags;
}

function resetSaveTags() {
  saveTags = [];
  renderSaveTags();
  const input = document.getElementById("ss-tag-input");
  if (input) input.value = "";
}

function renderSaveTags() {
  const container = document.getElementById("ss-tag-list");
  container.innerHTML = saveTags.map(renderRemovableTag).join("");
}

function renderRemovableTag(tag, index) {
  return `<span class="ss-tag-pill ss-tag-removable" data-index="${index}">
    ${escapeHtml(tag)} <span class="ss-tag-remove">&times;</span>
  </span>`;
}

function bindTagInput(inputId, renderFn, getTagsFn, setTagsFn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = input.value.trim().toLowerCase().slice(0, 20);
      if (value && !getTagsFn().includes(value) && getTagsFn().length < 5) {
        setTagsFn([...getTagsFn(), value]);
        renderFn();
      }
      input.value = "";
    }
  });
}

function initSaveTagEvents() {
  document.getElementById("ss-tag-list").addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".ss-tag-remove");
    if (!removeBtn) return;
    const pill = removeBtn.closest(".ss-tag-removable");
    const index = parseInt(pill.dataset.index, 10);
    saveTags.splice(index, 1);
    renderSaveTags();
  });

  bindTagInput(
    "ss-tag-input",
    renderSaveTags,
    () => saveTags,
    (v) => {
      saveTags = v;
    }
  );
}

// --- Tag editor modal ---

function openTagEditor(sessionId, cachedSessions) {
  const session = cachedSessions.find((s) => s.id === sessionId);
  if (!session) return;

  tagEditorSessionId = sessionId;
  tagEditorTags = [...(session.tags || [])];

  renderTagEditorList();
  document.getElementById("ss-tag-editor-overlay").classList.remove("hidden");
  document.getElementById("ss-tag-editor-input").value = "";
  document.getElementById("ss-tag-editor-input").focus();
}

function renderTagEditorList() {
  const container = document.getElementById("ss-tag-editor-list");
  container.innerHTML = tagEditorTags.map(renderRemovableTag).join("");

  container.querySelectorAll(".ss-tag-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pill = btn.closest(".ss-tag-removable");
      const index = parseInt(pill.dataset.index, 10);
      tagEditorTags.splice(index, 1);
      renderTagEditorList();
    });
  });
}

async function closeTagEditor(onDone) {
  document.getElementById("ss-tag-editor-overlay").classList.add("hidden");

  if (tagEditorSessionId) {
    await browser.runtime.sendMessage({
      action: "update-session-tags",
      sessionId: tagEditorSessionId,
      tags: tagEditorTags,
    });
    if (onDone) await onDone();
  }

  tagEditorSessionId = null;
  tagEditorTags = [];
}

function initTagEditorEvents(onDone) {
  bindTagInput(
    "ss-tag-editor-input",
    renderTagEditorList,
    () => tagEditorTags,
    (v) => {
      tagEditorTags = v;
    }
  );

  document.getElementById("ss-tag-editor-done").addEventListener("click", () => {
    closeTagEditor(onDone);
  });
  document.getElementById("ss-tag-editor-overlay").addEventListener("click", (e) => {
    if (e.target.id === "ss-tag-editor-overlay") closeTagEditor(onDone);
  });
}
