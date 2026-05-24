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
  container.replaceChildren(...saveTags.map(createRemovableTag));
}

function createRemovableTag(tag, index) {
  const pill = document.createElement("span");
  pill.className = "ss-tag-pill ss-tag-removable";
  pill.dataset.index = index;
  pill.append(tag + " ");
  const remove = document.createElement("span");
  remove.className = "ss-tag-remove";
  remove.textContent = "\u00D7";
  pill.appendChild(remove);
  return pill;
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
  container.replaceChildren(
    ...tagEditorTags.map((tag, index) => {
      const pill = createRemovableTag(tag, index);
      pill.querySelector(".ss-tag-remove").addEventListener("click", () => {
        tagEditorTags.splice(index, 1);
        renderTagEditorList();
      });
      return pill;
    })
  );
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
