// Session Snapshot - Content Script
// Responds to scroll position queries and restores scroll after page load.

const SCROLL_RESTORE_DELAY_MS = 300;

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "get-scroll") {
    sendResponse({
      x: window.scrollX || document.documentElement.scrollLeft || 0,
      y: window.scrollY || document.documentElement.scrollTop || 0,
    });
    return true;
  }

  if (message.action === "restore-scroll") {
    setTimeout(() => {
      window.scrollTo({
        left: message.x,
        top: message.y,
        behavior: "instant",
      });
    }, SCROLL_RESTORE_DELAY_MS);
    sendResponse({ success: true });
    return true;
  }
});
