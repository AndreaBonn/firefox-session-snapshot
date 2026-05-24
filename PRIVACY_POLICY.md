# Privacy Policy - Session Snapshot

**Last updated:** 2026-05-24

## Data Collection

Session Snapshot does **not** collect, transmit, or share any user data. All data stays on your device.

## What the extension stores

Session Snapshot saves the following information locally using Firefox's `browser.storage.local` API:

- **Tab URLs** of saved sessions
- **Tab titles** at the time of saving
- **Scroll positions** (horizontal and vertical) for each tab
- **Session names** chosen by the user
- **Session colors** chosen by the user
- **Session tags** (labels) assigned by the user
- **Timestamps** of when sessions were created or updated

This data never leaves your browser. There is no server, no analytics, no telemetry.

## Export and Import

Session Snapshot allows users to export session data as a JSON file and import sessions from a JSON file. Both operations happen entirely on-device:

- **Export** creates a local file download through the browser's standard download mechanism. No data is sent to any server.
- **Import** reads a local JSON file selected by the user through the browser's standard file picker. The data is validated and stored locally.

## Permissions explained

| Permission                    | Why it is needed                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `tabs`                        | Read the list of open tabs (URLs, titles) to save sessions                       |
| `storage`                     | Store and retrieve saved sessions locally                                        |
| `activeTab`                   | Access the currently active tab when saving                                      |
| `windows`                     | Create new windows when restoring sessions, track restored windows for auto-sync |
| `<all_urls>` (content script) | Inject a small script to read and restore scroll positions on any page           |

## Third-party services

Session Snapshot does not communicate with any external server or third-party service. Zero network requests are made by the extension.

## Data retention

Session data persists in `browser.storage.local` until the user explicitly deletes it through the extension's UI or uninstalls the extension.

## Changes to this policy

Updates to this policy will be reflected in the extension's repository and AMO listing. The "last updated" date at the top will change accordingly.

## Contact

For privacy questions, open an issue on the [GitHub repository](https://github.com/AndreaBonn/firefox-session-snapshot).
