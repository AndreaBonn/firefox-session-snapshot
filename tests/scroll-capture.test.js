const { loadScript } = require("./helpers");

describe("scroll-capture: content script", () => {
  let messageHandler;

  beforeAll(() => {
    // Capture the listener registered by the content script
    browser.runtime.onMessage.addListener.mockImplementation((handler) => {
      messageHandler = handler;
    });
    loadScript("content/scroll-capture.js");
  });

  beforeEach(() => {
    jest.useFakeTimers();
    // Reset scroll mocks
    Object.defineProperty(window, "scrollX", { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("responds to get-scroll with current scroll position", () => {
    Object.defineProperty(window, "scrollX", { value: 120, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 3400, configurable: true });

    const sendResponse = jest.fn();
    const result = messageHandler({ action: "get-scroll" }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ x: 120, y: 3400 });
    expect(result).toBe(true);
  });

  test("responds with 0,0 when scroll properties are falsy", () => {
    Object.defineProperty(window, "scrollX", { value: 0, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    // Also mock documentElement fallback
    Object.defineProperty(document.documentElement, "scrollLeft", { value: 0, configurable: true });
    Object.defineProperty(document.documentElement, "scrollTop", { value: 0, configurable: true });

    const sendResponse = jest.fn();
    messageHandler({ action: "get-scroll" }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ x: 0, y: 0 });
  });

  test("restore-scroll calls window.scrollTo after delay", () => {
    const sendResponse = jest.fn();
    messageHandler({ action: "restore-scroll", x: 50, y: 800 }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ success: true });
    expect(window.scrollTo).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);

    expect(window.scrollTo).toHaveBeenCalledWith({
      left: 50,
      top: 800,
      behavior: "instant",
    });
  });

  test("restore-scroll uses instant behavior, not smooth", () => {
    const sendResponse = jest.fn();
    messageHandler({ action: "restore-scroll", x: 0, y: 100 }, {}, sendResponse);

    jest.advanceTimersByTime(300);

    const call = window.scrollTo.mock.calls[0][0];
    expect(call.behavior).toBe("instant");
  });

  test("ignores unknown actions", () => {
    const sendResponse = jest.fn();
    const result = messageHandler({ action: "unknown" }, {}, sendResponse);

    expect(sendResponse).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
