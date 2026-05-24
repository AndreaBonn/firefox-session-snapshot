// Session Snapshot - Toast notification system
// Provides undo-capable toast for destructive actions.
// Depends on: ui-utils.js (loaded before this file)

const TOAST_DURATION_MS = 5000;
const TOAST_FADE_MS = 300;

let activeToast = null;

function showUndoToast(message, onConfirm, onUndo) {
  dismissActiveToast();

  const container = document.getElementById("ss-toast-container");
  const toast = document.createElement("div");
  toast.className = "ss-toast";
  toast.setAttribute("role", "alert");

  const progressId = `toast-progress-${Date.now()}`;

  toast.innerHTML = `
    <span class="ss-toast-message">${escapeHtml(message)}</span>
    <button class="ss-toast-undo" type="button">Annulla</button>
    <div class="ss-toast-progress" id="${progressId}"></div>
  `;

  container.appendChild(toast);

  const undoBtn = toast.querySelector(".ss-toast-undo");
  const progressBar = toast.querySelector(`#${progressId}`);
  let undone = false;

  progressBar.style.animationDuration = `${TOAST_DURATION_MS}ms`;
  progressBar.classList.add("ss-toast-progress-active");

  const timeoutId = setTimeout(() => {
    if (undone) return;
    removeToast(toast);
    onConfirm();
    activeToast = null;
  }, TOAST_DURATION_MS);

  undoBtn.addEventListener("click", () => {
    if (undone) return;
    undone = true;
    clearTimeout(timeoutId);
    removeToast(toast);
    onUndo();
    activeToast = null;
  });

  activeToast = { toast, timeoutId, onConfirm };
}

function removeToast(toast) {
  toast.classList.add("ss-toast-exit");
  setTimeout(() => toast.remove(), TOAST_FADE_MS);
}

function dismissActiveToast() {
  if (!activeToast) return;

  clearTimeout(activeToast.timeoutId);
  activeToast.onConfirm();
  removeToast(activeToast.toast);
  activeToast = null;
}
