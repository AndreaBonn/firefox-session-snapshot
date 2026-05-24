**English** | [Italiano](README.it.md)

# Session Snapshot

A Firefox extension that saves and restores browser working sessions. Each session captures open tabs and their scroll positions, and restores them in a dedicated window with automatic sync.

[![CI](https://github.com/AndreaBonn/firefox-session-snapshot/actions/workflows/ci.yml/badge.svg)](https://github.com/AndreaBonn/firefox-session-snapshot/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/AndreaBonn/firefox-session-snapshot/main/badges/test-badge.json)](https://github.com/AndreaBonn/firefox-session-snapshot/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/AndreaBonn/firefox-session-snapshot/main/badges/coverage-badge.json)](https://github.com/AndreaBonn/firefox-session-snapshot/actions/workflows/ci.yml)
![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue)
![JavaScript](https://img.shields.io/badge/javascript-ES2020-f7df1e)
![Firefox](https://img.shields.io/badge/firefox-%3E%3D91-ff7139)
![Version](https://img.shields.io/badge/version-1.1.0-green)

## Features

- Save all tabs from the current window as a named, color-coded session
- Restore sessions in a separate window with scroll position preserved
- Auto-sync: restored windows track tab changes (add, remove, navigate) and update the session automatically
- Search and filter saved sessions by name
- Inline rename with automatic duplicate handling
- Undo support on destructive actions (delete) via toast notification
- Dark and light theme following system preference
- Keyboard shortcuts: Ctrl+Shift+S (quick save), Ctrl+Shift+W (open popup)

## Architecture

```mermaid
%%{init: {'theme': 'default'}}%%
flowchart LR
    popup["Popup UI"]
    bg["Background Script"]
    cs["Content Script"]
    store["browser.storage.local"]

    popup -- "message passing" --> bg
    bg -- "get/restore scroll" --> cs
    bg -- "CRUD + auto-sync" --> store

    class popup,bg core
    class store data
    class cs engine

    classDef core fill:#2563eb,stroke:#1d4ed8,color:#fff
    classDef data fill:#d97706,stroke:#b45309,color:#fff
    classDef engine fill:#059669,stroke:#047857,color:#fff
```

The extension uses Firefox's Manifest V2 API with three layers:

- **Popup** renders the session list, handles user interactions, and sends commands to the background script via `browser.runtime.sendMessage`.
- **Background** (event page, non-persistent) manages session CRUD, tracks restored windows for auto-sync, and coordinates scroll capture/restore.
- **Content script** runs on all pages to read and restore scroll positions on demand.

### Save and restore flow

```mermaid
sequenceDiagram
    participant U as User
    participant P as Popup
    participant B as Background
    participant C as Content Script
    participant S as browser.storage

    U->>P: click "Save session"
    P->>B: sendMessage(save-session)
    B->>C: get-scroll (per tab)
    C-->>B: {x, y}
    B->>S: store session + index
    S-->>B: ok
    B-->>P: {success, session}
    P-->>U: session in list

    U->>P: click "Restore"
    P->>B: sendMessage(restore-session)
    B->>S: read session
    B->>B: create window + tabs
    B->>S: store pending scroll map
    B->>C: restore-scroll (on tab load)
    B-->>P: {success}
```

## Repository structure

```text
.
├── background/            # Session logic, storage, auto-sync, validation
│   ├── background.js      # Core CRUD, message handler, window tracking
│   └── validation.js      # Constants, input sanitization, URL filtering
├── content/
│   └── scroll-capture.js  # Scroll position get/restore via messages
├── popup/                 # Extension popup UI
│   ├── popup.html         # Popup markup
│   ├── popup.js           # Session list rendering, forms, context menu
│   ├── popup.css          # Light/dark theme styles
│   ├── search.js          # Real-time session filtering
│   ├── toast.js           # Undo-capable toast notifications
│   └── ui-utils.js        # Shared helpers (escapeHtml, formatAge, colors)
├── icons/                 # Extension icons (16/32/48/96px)
├── tests/                 # Jest unit tests (jsdom)
├── manifest.json          # Extension manifest (Manifest V2)
└── package.json           # Dev dependencies and scripts
```

## Prerequisites

- Firefox 91 or later
- Node.js 18+ (development only, for linting and tests)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/AndreaBonn/firefox-session-snapshot.git
cd firefox-session-snapshot
```

2. Install dev dependencies:

```bash
npm install
```

3. Load the extension in Firefox:
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on..."
   - Select `manifest.json` from the repository root

The extension stays active until Firefox is closed. Repeat step 3 after restarting.

## Running locally

| Command                 | Description                    |
| ----------------------- | ------------------------------ |
| `npm test`              | Run tests (Jest, verbose)      |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint`          | Lint with ESLint               |
| `npm run lint:fix`      | Lint with auto-fix             |
| `npm run format`        | Format with Prettier           |
| `npm run format:check`  | Check formatting               |

## Testing

Tests use Jest with jsdom environment, located in `tests/`. Test files mirror source modules:

- `background.test.js` - session CRUD, message handler, auto-sync
- `popup.test.js` - UI rendering, user interactions
- `scroll-capture.test.js` - content script behavior
- `search.test.js` - filtering logic
- `toast.test.js` - toast notifications and undo

## Security

Input validation, URL filtering, and output escaping are implemented across the extension. For details and vulnerability reporting, see [SECURITY.md](./SECURITY.md).

## License

Released under the Apache License 2.0. See [LICENSE](./LICENSE).

## Support the project

If you found Session Snapshot useful, consider giving it a [star on GitHub](https://github.com/AndreaBonn/firefox-session-snapshot) - it helps others discover it.
