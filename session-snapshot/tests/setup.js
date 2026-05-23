// Mock WebExtension browser API for all tests

const storageMock = (() => {
  let store = {};
  return {
    local: {
      get: jest.fn(async (keys) => {
        if (typeof keys === "string") {
          return { [keys]: store[keys] ?? undefined };
        }
        if (Array.isArray(keys)) {
          const result = {};
          for (const key of keys) {
            if (store[key] !== undefined) result[key] = store[key];
          }
          return result;
        }
        return {};
      }),
      set: jest.fn(async (items) => {
        Object.assign(store, items);
      }),
      remove: jest.fn(async (keys) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const key of keyList) {
          delete store[key];
        }
      }),
    },
    _clear: () => {
      store = {};
    },
    _getStore: () => store,
  };
})();

const tabsMock = {
  sendMessage: jest.fn(async () => ({ x: 0, y: 0 })),
  create: jest.fn(async (opts) => ({
    id: Math.floor(Math.random() * 10000),
    ...opts,
  })),
  update: jest.fn(async () => ({})),
  onUpdated: {
    addListener: jest.fn(),
  },
};

const windowsMock = {
  getCurrent: jest.fn(async () => ({
    id: 1,
    tabs: [
      {
        id: 101,
        index: 0,
        url: "https://example.com",
        title: "Example",
        favIconUrl: "https://example.com/favicon.ico",
        active: true,
        pinned: false,
      },
      {
        id: 102,
        index: 1,
        url: "https://github.com",
        title: "GitHub",
        favIconUrl: null,
        active: false,
        pinned: false,
      },
    ],
  })),
  create: jest.fn(async (opts) => ({
    id: 99,
    tabs: [{ id: 201, url: opts.url }],
  })),
};

const runtimeMock = {
  sendMessage: jest.fn(),
  onMessage: {
    addListener: jest.fn(),
  },
};

const commandsMock = {
  onCommand: {
    addListener: jest.fn(),
  },
};

global.browser = {
  storage: storageMock,
  tabs: tabsMock,
  windows: windowsMock,
  runtime: runtimeMock,
  commands: commandsMock,
};

// Helper to reset storage between tests
global.resetBrowserMocks = () => {
  storageMock._clear();
  jest.clearAllMocks();
};
