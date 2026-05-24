# Changelog

All notable changes to Session Snapshot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-05-24

### Added

- Full bilingual support (English/Italian) with runtime language switching
- Locale files (`_locales/en/`, `_locales/it/`) for all UI strings
- Max 200 sessions limit with validation
- 1-second throttle on save-session to prevent duplicate saves

### Changed

- Migrated from Manifest V2 to Manifest V3 (background.scripts, action, host_permissions, content_security_policy)
- Minimum Firefox version raised from 91.0 to 109.0 (required for MV3 support)
- Extracted shared constants and i18n helpers to `shared/` directory
- Popup split into 5 modules (popup, tags, export-import, context-menu, inline-rename)

### Fixed

- Shadowed variable in session-crud arrow functions
- Session ID collisions (added random suffix)
- maxLength input attribute aligned to MAX_SESSION_NAME_LENGTH constant (100)
- Silent catch in auto-sync syncTrackedWindow now logs warning

### Security

- Removed unused `data-i18n-html` attribute that allowed innerHTML injection

## [1.2.0] - 2026-05-24

### Added

- Export all sessions (or a single one) as JSON file for backup and migration
- Import sessions from JSON file with validation, name deduplication, and URL filtering
- Tag sessions with up to 5 labels each for organization
- Tag editor modal for managing tags on existing sessions
- Search and filter sessions by name or tag
- Storage usage indicator in the popup footer (estimated MB used and session count)
- Auto-save: final sync when closing a tracked (restored) window
- Deferred delete: session deletion now survives popup close via background timer

### Changed

- Background script split into 6 focused modules (validation, storage, session-crud, auto-sync, export-import, background)
- Popup split into 3 modules (popup, tags, export-import)
- Context menu now includes "Manage tags" and "Export session" actions
- Delete operation uses schedule-delete/cancel-delete messaging for reliable undo

### Fixed

- Session delete was lost if the popup closed during the undo countdown (toast timer lived in popup scope)
- Accumulated event listeners when opening the tag editor multiple times
- Session count display was incorrect during rapid sequential deletes

### Security

- Tag input sanitization (lowercase, pattern validation, max length, deduplication)
- Import data validation (structure, field types, size limits, URL scheme filtering)
- Imported session IDs are regenerated to prevent collisions
- Imported favicon URLs are filtered with the same scheme allowlist as tab URLs

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
