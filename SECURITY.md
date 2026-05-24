**English** | [Italiano](SECURITY.it.md)

## Supported Versions

This project is in active development. Security updates are applied to the latest commit on `main`.

## Reporting a Vulnerability

To report a security vulnerability, use [GitHub Security Advisories](https://github.com/AndreaBonn/firefox-session-snapshot/security/advisories/new).

Please include:

- Description of the vulnerability
- Steps to reproduce
- Expected vs actual behavior
- Impact assessment (what an attacker could achieve)

**Response timeline:**

- Acknowledgment: within 72 hours
- Fix for critical issues: within 30 days
- Coordinated public disclosure after the fix is released

## Security Measures Implemented

- **Input validation**: session names are sanitized and truncated to 100 characters. Scroll values are bounded to a safe range. Tag labels are sanitized, lowercased, and limited to 5 per session with 20 characters each (`background/validation.js`).
- **Session ID validation**: session IDs are validated against a strict pattern before any mutation (`background/validation.js`, `background/background.js`).
- **URL filtering**: only `https:`, `http:`, `ftp:`, and `file:` schemes are allowed when restoring tabs. Internal URLs (`about:`, `moz-extension:`) are excluded from saved sessions. Imported favicon URLs are filtered with the same scheme allowlist (`background/validation.js`, `background/export-import.js`).
- **Import validation**: imported JSON data is validated for structure, field types, and size limits. Session IDs are regenerated on import to prevent collisions. Names are sanitized and deduplicated. Tabs with disallowed URL schemes are rejected (`background/export-import.js`).
- **Content script protection**: mutation actions (`save-session`, `restore-session`, `delete-session`, `schedule-delete`, `cancel-delete`, `rename-session`, `update-session`, `update-session-tags`, `import-sessions`) sent from content scripts are rejected (`background/background.js`).
- **Content Security Policy**: `script-src 'self'; style-src 'self'; object-src 'self'` (`manifest.json`).
- **Output escaping**: HTML output in the popup uses `escapeHtml()` to prevent XSS. Tag labels are escaped before rendering (`popup/ui-utils.js`, `popup/tags.js`).
- **Color validation**: hex color values are validated against a strict pattern before use (`background/validation.js`).
- **Dependency pinning**: `package-lock.json` is committed.

## Out of Scope

The following are not considered vulnerabilities for this project:

- Self-XSS (attacks requiring the victim to paste code in their own console)
- Social engineering attacks
- Vulnerabilities in third-party dependencies already publicly disclosed (report these to the upstream maintainer)
- Denial of service through excessive legitimate use

## Acknowledgments

Security researchers who have responsibly disclosed vulnerabilities will be listed here.

---

[Back to README](./README.md)
