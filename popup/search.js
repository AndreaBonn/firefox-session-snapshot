// Session Snapshot - Search/filter module
// Provides real-time text filtering on session list.
// Depends on: ui-utils.js (loaded before this file)

const SEARCH_DEBOUNCE_MS = 150;

let searchDebounceTimer = null;
let currentSearchQuery = "";

function initSearch() {
  const input = document.getElementById("ss-search-input");
  if (!input) return;

  input.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentSearchQuery = input.value.trim().toLowerCase();
      filterSessionList();
    }, SEARCH_DEBOUNCE_MS);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      currentSearchQuery = "";
      filterSessionList();
      input.blur();
    }
  });
}

function getSearchQuery() {
  return currentSearchQuery;
}

function clearSearch() {
  const input = document.getElementById("ss-search-input");
  if (input) input.value = "";
  currentSearchQuery = "";
}

function filterSessionList() {
  const list = document.getElementById("ss-sessions-list");
  if (!list) return;
  const items = list.querySelectorAll(".ss-session-item");
  let visibleCount = 0;

  items.forEach((item) => {
    const nameEl = item.querySelector(".ss-session-name");
    if (!nameEl) return;

    const name = nameEl.textContent.toLowerCase();
    const matches = !currentSearchQuery || name.includes(currentSearchQuery);
    item.classList.toggle("hidden", !matches);
    if (matches) visibleCount++;
  });

  const empty = document.getElementById("ss-empty-state");
  const noResults = document.getElementById("ss-no-results");

  if (items.length === 0) {
    empty.classList.remove("hidden");
    noResults.classList.add("hidden");
  } else if (visibleCount === 0 && currentSearchQuery) {
    empty.classList.add("hidden");
    noResults.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    noResults.classList.add("hidden");
  }
}
