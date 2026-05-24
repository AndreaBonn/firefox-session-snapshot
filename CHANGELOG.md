# Changelog

All notable changes to Session Snapshot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-15

### Added

- Auto-sync: restored windows automatically track tab changes (add, remove, navigate) and update the saved session
- Keyboard shortcut Ctrl+Shift+S for quick save of the current session
- Keyboard shortcut Ctrl+Shift+W to open the popup
- Search and filter sessions by name with real-time results
- Inline rename with automatic duplicate name handling
- Undo support on session delete via toast notification
- Color picker with 8 predefined colors for session labels
- Dark theme following system preference
- Comprehensive input validation and URL filtering
- Content Security Policy (CSP) enforcement

### Security

- Input sanitization on session names, scroll values, and session IDs
- URL scheme allowlist (https, http, ftp, file only)
- HTML output escaping to prevent XSS
- Content script mutation protection

## [1.0.0] - 2025-10-01

### Added

- Save all tabs from the current window as a named session
- Restore sessions in a separate window
- Scroll position capture and restore per tab
- Session list with tab count display
- Delete sessions
- Extension icons (16/32/48/96px)
