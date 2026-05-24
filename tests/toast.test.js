const fs = require("fs");
const path = require("path");
const { loadScript } = require("./helpers");

const popupHtml = fs.readFileSync(path.resolve(__dirname, "../popup/popup.html"), "utf-8");

describe("toast: showUndoToast", () => {
  beforeAll(() => {
    document.documentElement.innerHTML = popupHtml;
    loadScript("popup/ui-utils.js");
    loadScript("popup/toast.js");
  });

  beforeEach(() => {
    jest.useFakeTimers();
    const container = document.getElementById("ss-toast-container");
    container.innerHTML = "";
    activeToast = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("creates toast element in container", () => {
    const onConfirm = jest.fn();
    const onUndo = jest.fn();
    showUndoToast("Test eliminata", onConfirm, onUndo);

    const container = document.getElementById("ss-toast-container");
    const toast = container.querySelector(".ss-toast");
    expect(toast).not.toBeNull();
    expect(toast.querySelector(".ss-toast-message").textContent).toBe("Test eliminata");
    expect(toast.querySelector(".ss-toast-undo")).not.toBeNull();
  });

  test("calls onConfirm after timeout expires", () => {
    const onConfirm = jest.fn();
    const onUndo = jest.fn();
    showUndoToast("Sessione eliminata", onConfirm, onUndo);

    expect(onConfirm).not.toHaveBeenCalled();
    jest.advanceTimersByTime(TOAST_DURATION_MS);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
  });

  test("calls onUndo when undo button is clicked", () => {
    const onConfirm = jest.fn();
    const onUndo = jest.fn();
    showUndoToast("Sessione eliminata", onConfirm, onUndo);

    const undoBtn = document.querySelector(".ss-toast-undo");
    undoBtn.click();

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("undo click prevents onConfirm from firing on timeout", () => {
    const onConfirm = jest.fn();
    const onUndo = jest.fn();
    showUndoToast("Sessione eliminata", onConfirm, onUndo);

    document.querySelector(".ss-toast-undo").click();
    jest.advanceTimersByTime(TOAST_DURATION_MS + 1000);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  test("double-clicking undo only triggers once", () => {
    const onUndo = jest.fn();
    showUndoToast("Test", jest.fn(), onUndo);

    const undoBtn = document.querySelector(".ss-toast-undo");
    undoBtn.click();
    undoBtn.click();

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  test("new toast dismisses previous toast and confirms its action", () => {
    const onConfirm1 = jest.fn();
    const onUndo1 = jest.fn();
    showUndoToast("First", onConfirm1, onUndo1);

    const onConfirm2 = jest.fn();
    const onUndo2 = jest.fn();
    showUndoToast("Second", onConfirm2, onUndo2);

    // First toast's onConfirm should have been called (dismissed)
    expect(onConfirm1).toHaveBeenCalledTimes(1);
    expect(onUndo1).not.toHaveBeenCalled();

    // Second toast is now active
    const toasts = document.querySelectorAll(".ss-toast");
    const visibleMessages = Array.from(toasts)
      .filter((t) => !t.classList.contains("ss-toast-exit"))
      .map((t) => t.querySelector(".ss-toast-message").textContent);
    expect(visibleMessages).toContain("Second");
  });

  test("toast has progress bar with active animation class", () => {
    showUndoToast("Test", jest.fn(), jest.fn());

    const progress = document.querySelector(".ss-toast-progress-active");
    expect(progress).not.toBeNull();
    expect(progress.style.animationDuration).toBe(`${TOAST_DURATION_MS}ms`);
  });

  test("toast has role=alert for accessibility", () => {
    showUndoToast("Test", jest.fn(), jest.fn());

    const toast = document.querySelector(".ss-toast");
    expect(toast.getAttribute("role")).toBe("alert");
  });
});

describe("toast: dismissActiveToast", () => {
  beforeAll(() => {
    // Scripts already loaded in previous describe block
  });

  beforeEach(() => {
    jest.useFakeTimers();
    const container = document.getElementById("ss-toast-container");
    container.innerHTML = "";
    activeToast = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("does nothing when no toast is active", () => {
    expect(() => dismissActiveToast()).not.toThrow();
  });

  test("confirms and removes active toast", () => {
    const onConfirm = jest.fn();
    showUndoToast("Test", onConfirm, jest.fn());

    dismissActiveToast();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(activeToast).toBeNull();
  });
});
