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

- **Input validation**: session names are sanitized and truncated to 100 characters (`background/validation.js:30-33`). Scroll values are bounded to a safe range (`background/validation.js:35-39`).
- **Session ID validation**: session IDs are validated against a strict pattern before any mutation (`background/validation.js:22-24`, `background/background.js:432-438`).
- **URL filtering**: only `https:`, `http:`, `ftp:`, and `file:` schemes are allowed when restoring tabs. Internal URLs (`about:`, `moz-extension:`) are excluded from saved sessions (`background/validation.js:41-52`).
- **Content script protection**: mutation actions (`save-session`, `restore-session`, `delete-session`, `rename-session`, `update-session`) sent from content scripts are rejected (`background/background.js:422-429`).
- **Content Security Policy**: `script-src 'self'; style-src 'self'; object-src 'self'` (`manifest.json:18`).
- **Output escaping**: HTML output in the popup uses `escapeHtml()` to prevent XSS (`popup/ui-utils.js:15-18`, `popup/toast.js:21`).
- **Color validation**: hex color values are validated against a strict pattern before use (`background/validation.js:26-28`).
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
