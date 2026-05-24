// Session Snapshot - Inline rename
// Handles in-place session name editing.
// Depends on: popup.js (loadSessions)

function startInlineRename(sessionId) {
  const item = document.querySelector(`.ss-session-item[data-id="${sessionId}"]`);
  if (!item) return;

  const nameEl = item.querySelector(".ss-session-name");
  const currentName = nameEl.textContent;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "ss-rename-input";
  input.value = currentName;
  input.maxLength = 100;

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
