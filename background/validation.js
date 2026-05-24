// Session Snapshot - Input validation and constants
// Loaded first via manifest background.scripts array.

const STORAGE_INDEX_KEY = "snapshot_index";
const STORAGE_SESSION_PREFIX = "snapshot_";
const STORAGE_PENDING_SCROLL_KEY = "snapshot_pending_scroll";
const STORAGE_TRACKED_WINDOWS_KEY = "snapshot_tracked_windows";
const AUTO_SYNC_DEBOUNCE_MS = 2000;
const DEFERRED_DELETE_MS = 5000;

const AUTO_COLORS = [
  "#0969da",
  "#1a7f37",
  "#9a3412",
  "#6e40c9",
  "#b45309",
  "#0e7490",
  "#be185d",
  "#374151",
];

const EXCLUDED_URL_PREFIXES = ["about:", "moz-extension:"];
const ALLOWED_URL_SCHEMES = ["https:", "http:", "ftp:", "file:"];
const SESSION_ID_PATTERN = /^sess_\d+$/;
const SESSION_ID_IMPORT_PATTERN = /^sess_\d+_[a-z0-9]+$/;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const MAX_SESSION_NAME_LENGTH = 100;
const MAX_SCROLL_VALUE = 200000;
const MAX_TAGS_PER_SESSION = 5;
const MAX_TAG_LENGTH = 20;
const TAG_PATTERN = /^[a-zA-Z0-9À-ÿ][a-zA-Z0-9À-ÿ\s-]*$/;

function isValidSessionId(sessionId) {
  if (typeof sessionId !== "string") return false;
  return SESSION_ID_PATTERN.test(sessionId) || SESSION_ID_IMPORT_PATTERN.test(sessionId);
}

function isValidColor(color) {
  return typeof color === "string" && HEX_COLOR_PATTERN.test(color);
}

function sanitizeName(name) {
  if (typeof name !== "string") return "";
  return name.trim().slice(0, MAX_SESSION_NAME_LENGTH);
}

function sanitizeScroll(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(num, MAX_SCROLL_VALUE);
}

function isAllowedUrlScheme(url) {
  try {
    const scheme = new URL(url).protocol;
    return ALLOWED_URL_SCHEMES.includes(scheme);
  } catch {
    return false;
  }
}

function isExcludedUrl(url) {
  return EXCLUDED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function getAutoColor(indexLength) {
  return AUTO_COLORS[indexLength % AUTO_COLORS.length];
}

function sanitizeTag(tag) {
  if (typeof tag !== "string") return "";
  const trimmed = tag.trim().slice(0, MAX_TAG_LENGTH).toLowerCase();
  return TAG_PATTERN.test(trimmed) ? trimmed : "";
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const result = [];

  for (const tag of tags) {
    const clean = sanitizeTag(tag);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      result.push(clean);
    }
    if (result.length >= MAX_TAGS_PER_SESSION) break;
  }

  return result;
}
