# Session Snapshot — Specifiche Tecniche e Funzionali

**Versione:** 1.0  
**Target:** Estensione Firefox (WebExtension API / Manifest V2)  
**Destinatario:** Claude Code (implementazione autonoma)

---

## 1. Panoramica del Progetto

**Session Snapshot** è un'estensione Firefox che permette di salvare l'intero stato di una finestra del browser (schede aperte + posizione di scroll) con un nome personalizzato, e di ripristinarla in qualsiasi momento aprendola in una nuova finestra separata. L'obiettivo è permettere all'utente di organizzare il lavoro per progetti distinti, ognuno con il proprio spazio di schede, ripristinabile istantaneamente senza perdere il contesto corrente.

### 1.1 Caso d'uso principale

L'utente lavora su più progetti in parallelo. Per ogni progetto ha un set fisso di schede (documenti, strumenti, riferimenti). Con Session Snapshot può:

- Salvare la finestra corrente come sessione nominata (es. "Progetto A")
- Chiudere la finestra quando non serve
- Riaprirla in un secondo momento esattamente com'era, in una nuova finestra affiancata al lavoro corrente

### 1.2 Principi di design

- **Non distruttivo**: il ripristino apre sempre una nuova finestra, mai sovrascrive quella corrente
- **Persistente**: le sessioni sopravvivono alla chiusura e al riavvio di Firefox
- **Immediato**: salvataggio e ripristino in un click
- **Semplice**: UI minimalista, nessuna configurazione richiesta
- **Affidabile**: nessuna perdita di dati in caso di crash o chiusura accidentale

---

## 2. Struttura del Progetto

```
session-snapshot/
├── manifest.json
├── background/
│   └── background.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/
│   └── scroll-capture.js
└── icons/
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    └── icon-96.png
```

---

## 3. Manifest (`manifest.json`)

```json
{
  "manifest_version": 2,
  "name": "Session Snapshot",
  "version": "1.0.0",
  "description": "Salva e ripristina sessioni di lavoro per progetto. Ogni sessione ricorda schede e posizione di scroll.",
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "96": "icons/icon-96.png"
  },
  "permissions": [
    "tabs",
    "windows",
    "storage",
    "activeTab",
    "sessions"
  ],
  "background": {
    "scripts": ["background/background.js"],
    "persistent": false
  },
  "browser_action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png"
    },
    "default_title": "Session Snapshot"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/scroll-capture.js"],
      "run_at": "document_idle"
    }
  ],
  "commands": {
    "save-session": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "MacCtrl+Shift+S"
      },
      "description": "Salva rapidamente la sessione corrente"
    },
    "open-popup": {
      "suggested_key": {
        "default": "Ctrl+Shift+W",
        "mac": "MacCtrl+Shift+W"
      },
      "description": "Apri Session Snapshot"
    }
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "session-snapshot@extension",
      "strict_min_version": "91.0"
    }
  }
}
```

---

## 4. Modello Dati

### 4.1 Struttura di una sessione

```javascript
{
  id: "sess_1704067200000",          // Timestamp di creazione come ID univoco
  name: "Progetto A",                // Nome dato dall'utente
  createdAt: 1704067200000,          // Unix timestamp creazione
  updatedAt: 1704067200000,          // Unix timestamp ultimo aggiornamento
  windowId: 42,                      // ID finestra Firefox al momento del salvataggio (volatile)
  tabs: [
    {
      index: 0,                      // Ordine della scheda nella finestra
      url: "https://github.com/...", // URL completo
      title: "GitHub - my-repo",     // Titolo al momento del salvataggio
      favIconUrl: "https://...",     // URL favicon
      active: true,                  // Era la scheda attiva?
      pinned: false,                 // Era pinnata?
      scrollX: 0,                    // Posizione scroll orizzontale
      scrollY: 1240,                 // Posizione scroll verticale
    },
    // ... altre schede
  ],
  tabCount: 4,                       // Cache del numero di schede
  color: "#0969da"                   // Colore etichetta (scelto dall'utente o assegnato auto)
}
```

### 4.2 Storage layout

Tutte le sessioni sono salvate in `browser.storage.local` (non sync, per evitare limiti di quota):

```javascript
// Chiave indice: lista degli ID in ordine
"snapshot_index": ["sess_1704067200000", "sess_1704153600000", ...]

// Chiave per ogni sessione
"snapshot_sess_1704067200000": { /* oggetto sessione completo */ }
```

La separazione tra indice e sessioni permette di caricare la lista senza caricare tutti i dati.

### 4.3 Limiti di storage

`browser.storage.local` ha un limite di ~10MB. Con URL medi di 100 caratteri e 10 schede per sessione, ogni sessione occupa ~5KB. Il sistema supporta comodamente centinaia di sessioni.

---

## 5. Architettura e Flusso di Comunicazione

```
┌─────────────────────────┐
│      POPUP UI           │  ← Interfaccia principale dell'utente
│  popup.html/js/css      │  ← Lista sessioni, salva, ripristina, elimina
└────────────┬────────────┘
             │ browser.runtime.sendMessage
             │
┌────────────▼────────────┐
│   BACKGROUND SCRIPT     │  ← Logica di business
│   background.js         │  ← Accede a tabs/windows API
│                         │  ← Legge/scrive storage
│                         │  ← Cattura scroll tramite content script
└────────────┬────────────┘
             │ browser.tabs.sendMessage
             │
┌────────────▼────────────┐
│   CONTENT SCRIPT        │  ← Iniettato in ogni scheda
│   scroll-capture.js     │  ← Risponde a richieste di scroll position
│                         │  ← Ripristina scroll position dopo caricamento
└─────────────────────────┘
```

---

## 6. Background Script (`background/background.js`)

### 6.1 Listener messaggi

```javascript
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "get-sessions":
      getSessions().then(sendResponse);
      return true;

    case "save-session":
      saveSession(message.name, message.color).then(sendResponse);
      return true;

    case "restore-session":
      restoreSession(message.sessionId).then(sendResponse);
      return true;

    case "delete-session":
      deleteSession(message.sessionId).then(sendResponse);
      return true;

    case "rename-session":
      renameSession(message.sessionId, message.name).then(sendResponse);
      return true;

    case "update-session":
      updateSession(message.sessionId).then(sendResponse);
      return true;
  }
});
```

### 6.2 Salvataggio sessione

```javascript
async function saveSession(name, color) {
  // 1. Ottieni la finestra corrente
  const currentWindow = await browser.windows.getCurrent({ populate: true });

  // 2. Per ogni scheda, richiedi la posizione di scroll
  const tabs = await Promise.all(
    currentWindow.tabs
      .filter(tab => !tab.url.startsWith("about:") && !tab.url.startsWith("moz-extension:"))
      .map(async (tab) => {
        let scrollX = 0, scrollY = 0;
        try {
          const scroll = await browser.tabs.sendMessage(tab.id, { action: "get-scroll" });
          scrollX = scroll.x;
          scrollY = scroll.y;
        } catch (e) {
          // Content script non disponibile su questa scheda (es. PDF, pagina di errore)
        }
        return {
          index: tab.index,
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl || null,
          active: tab.active,
          pinned: tab.pinned,
          scrollX,
          scrollY
        };
      })
  );

  // 3. Costruisci oggetto sessione
  const now = Date.now();
  const id = `sess_${now}`;
  const session = {
    id,
    name: name || `Sessione del ${new Date(now).toLocaleDateString("it-IT")}`,
    createdAt: now,
    updatedAt: now,
    windowId: currentWindow.id,
    tabs,
    tabCount: tabs.length,
    color: color || getAutoColor()
  };

  // 4. Salva in storage
  const index = await getIndex();
  index.unshift(id); // Le più recenti prima
  await browser.storage.local.set({
    "snapshot_index": index,
    [`snapshot_${id}`]: session
  });

  return { success: true, session };
}
```

### 6.3 Ripristino sessione

```javascript
async function restoreSession(sessionId) {
  const session = await getSession(sessionId);
  if (!session) return { success: false, error: "Sessione non trovata" };

  // 1. Crea nuova finestra con la prima scheda
  const firstTab = session.tabs.find(t => !t.pinned) || session.tabs[0];
  const newWindow = await browser.windows.create({
    url: firstTab.url,
    focused: true
  });

  const newWindowId = newWindow.id;
  const createdTabIds = [newWindow.tabs[0].id];

  // 2. Apri le schede rimanenti in ordine
  const remainingTabs = session.tabs
    .filter((_, i) => i !== session.tabs.indexOf(firstTab))
    .sort((a, b) => a.index - b.index);

  for (const tab of remainingTabs) {
    const created = await browser.tabs.create({
      windowId: newWindowId,
      url: tab.url,
      pinned: tab.pinned,
      active: false
    });
    createdTabIds.push(created.id);
  }

  // 3. Attiva la scheda che era attiva al salvataggio
  const activeTabData = session.tabs.find(t => t.active);
  if (activeTabData) {
    const activeIndex = session.tabs.indexOf(activeTabData);
    if (createdTabIds[activeIndex]) {
      await browser.tabs.update(createdTabIds[activeIndex], { active: true });
    }
  }

  // 4. Aggiorna windowId nella sessione salvata
  session.windowId = newWindowId;
  await browser.storage.local.set({ [`snapshot_${sessionId}`]: session });

  // 5. Ripristino scroll: avviene nel content script dopo il caricamento della pagina
  // Salva mapping temporaneo tabId -> scrollPosition
  const scrollMap = {};
  session.tabs.forEach((tab, i) => {
    if (createdTabIds[i]) {
      scrollMap[createdTabIds[i]] = { x: tab.scrollX, y: tab.scrollY };
    }
  });
  await browser.storage.local.set({ "snapshot_pending_scroll": scrollMap });

  return { success: true, windowId: newWindowId };
}
```

### 6.4 Ripristino scroll post-caricamento

Il content script non può scrollare prima che la pagina sia caricata. Il background ascolta `tabs.onUpdated` e invia il comando di scroll quando la scheda è pronta:

```javascript
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;

  const data = await browser.storage.local.get("snapshot_pending_scroll");
  const scrollMap = data.snapshot_pending_scroll || {};

  if (scrollMap[tabId]) {
    try {
      await browser.tabs.sendMessage(tabId, {
        action: "restore-scroll",
        x: scrollMap[tabId].x,
        y: scrollMap[tabId].y
      });
    } catch (e) {
      // Pagina non supporta content script
    }
    // Rimuovi dal pending map
    delete scrollMap[tabId];
    await browser.storage.local.set({ "snapshot_pending_scroll": scrollMap });
  }
});
```

### 6.5 Eliminazione sessione

```javascript
async function deleteSession(sessionId) {
  const index = await getIndex();
  const newIndex = index.filter(id => id !== sessionId);
  await browser.storage.local.remove(`snapshot_${sessionId}`);
  await browser.storage.local.set({ "snapshot_index": newIndex });
  return { success: true };
}
```

### 6.6 Aggiornamento sessione (sovrascrittura)

```javascript
async function updateSession(sessionId) {
  const existing = await getSession(sessionId);
  if (!existing) return { success: false };
  // Salva con stesso nome e colore, aggiorna tutto il resto
  return saveSessionWithId(sessionId, existing.name, existing.color);
}
```

### 6.7 Colori automatici

Assegnare un colore ciclico tra un set predefinito quando l'utente non ne sceglie uno:

```javascript
const AUTO_COLORS = [
  "#0969da", "#1a7f37", "#9a3412", "#6e40c9",
  "#b45309", "#0e7490", "#be185d", "#374151"
];

function getAutoColor() {
  // Basato sul numero di sessioni esistenti
  return AUTO_COLORS[index.length % AUTO_COLORS.length];
}
```

---

## 7. Content Script (`content/scroll-capture.js`)

```javascript
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "get-scroll") {
    sendResponse({
      x: window.scrollX || document.documentElement.scrollLeft || 0,
      y: window.scrollY || document.documentElement.scrollTop || 0
    });
    return true;
  }

  if (message.action === "restore-scroll") {
    // Piccolo delay per garantire rendering completo
    setTimeout(() => {
      window.scrollTo({
        left: message.x,
        top: message.y,
        behavior: "instant"
      });
    }, 300);
    sendResponse({ success: true });
    return true;
  }
});
```

---

## 8. Popup UI

### 8.1 Layout generale (`popup.html`)

Il popup si apre cliccando l'icona dell'estensione nella toolbar di Firefox. Dimensioni: **360px × 520px**.

```
┌──────────────────────────────────┐
│  📸 Session Snapshot        [⚙]  │  ← Header
├──────────────────────────────────┤
│  [+ Salva sessione corrente    ] │  ← CTA primaria
├──────────────────────────────────┤
│  Le tue sessioni (3)             │  ← Sezione lista
│                                  │
│  ● Progetto A          4 schede  │
│    Salvata oggi, 09:30      [▶] [⋮]│
│                                  │
│  ● Ricerca             7 schede  │
│    Salvata ieri, 14:22      [▶] [⋮]│
│                                  │
│  ● Social              3 schede  │
│    Salvata 3 giorni fa      [▶] [⋮]│
│                                  │
│  (lista scrollabile)             │
└──────────────────────────────────┘
```

### 8.2 Struttura HTML completa

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Snapshot</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <!-- Header -->
  <header id="ss-header">
    <div id="ss-logo">
      <img src="../icons/icon-32.png" alt="" />
      <span>Session Snapshot</span>
    </div>
  </header>

  <!-- Salva sessione corrente -->
  <div id="ss-save-section">
    <div id="ss-save-collapsed">
      <button id="ss-save-btn">
        <span>+</span> Salva sessione corrente
      </button>
    </div>
    <div id="ss-save-expanded" class="hidden">
      <input 
        id="ss-session-name" 
        type="text" 
        placeholder="Nome sessione (es. Progetto A)"
        maxlength="50"
      />
      <div id="ss-color-picker">
        <!-- 8 cerchi colorati selezionabili -->
      </div>
      <div id="ss-save-actions">
        <button id="ss-save-confirm">Salva</button>
        <button id="ss-save-cancel">Annulla</button>
      </div>
    </div>
  </div>

  <!-- Lista sessioni -->
  <div id="ss-sessions-section">
    <div id="ss-sessions-header">
      <span id="ss-sessions-count">Le tue sessioni</span>
    </div>
    <div id="ss-sessions-list">
      <!-- Popolato dinamicamente da popup.js -->
    </div>
    <div id="ss-empty-state" class="hidden">
      <p>Nessuna sessione salvata.</p>
      <p>Clicca "+ Salva sessione corrente" per iniziare.</p>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

### 8.3 Template singola sessione (generato da JS)

```javascript
function renderSession(session) {
  const age = formatAge(session.updatedAt);
  return `
    <div class="ss-session-item" data-id="${session.id}">
      <div class="ss-session-color" style="background: ${session.color}"></div>
      <div class="ss-session-info">
        <div class="ss-session-name">${escapeHtml(session.name)}</div>
        <div class="ss-session-meta">
          ${session.tabCount} schede · ${age}
        </div>
      </div>
      <div class="ss-session-actions">
        <button class="ss-restore-btn" data-id="${session.id}" title="Ripristina in nuova finestra">
          ▶
        </button>
        <button class="ss-menu-btn" data-id="${session.id}" title="Opzioni">
          ⋮
        </button>
      </div>
    </div>
  `;
}
```

### 8.4 Menu contestuale per sessione

Al click sul pulsante `⋮`, appare un menu inline con:

- **Aggiorna** — sovrascrive la sessione con le schede attuali della finestra corrente
- **Rinomina** — mostra un input inline per modificare il nome
- **Elimina** — chiede conferma, poi elimina

```javascript
function renderContextMenu(sessionId) {
  return `
    <div class="ss-context-menu" data-id="${sessionId}">
      <button class="ss-menu-item" data-action="update">
        🔄 Aggiorna con schede correnti
      </button>
      <button class="ss-menu-item" data-action="rename">
        ✏️ Rinomina
      </button>
      <hr />
      <button class="ss-menu-item ss-danger" data-action="delete">
        🗑️ Elimina
      </button>
    </div>
  `;
}
```

### 8.5 Popup.js — logica principale

```javascript
document.addEventListener("DOMContentLoaded", async () => {
  await loadSessions();
  bindEvents();
});

async function loadSessions() {
  const response = await browser.runtime.sendMessage({ action: "get-sessions" });
  const sessions = response.sessions || [];
  
  const list = document.getElementById("ss-sessions-list");
  const empty = document.getElementById("ss-empty-state");
  const count = document.getElementById("ss-sessions-count");

  if (sessions.length === 0) {
    list.classList.add("hidden");
    empty.classList.remove("hidden");
    count.textContent = "Nessuna sessione";
    return;
  }

  count.textContent = `Le tue sessioni (${sessions.length})`;
  list.innerHTML = sessions.map(renderSession).join("");
  empty.classList.add("hidden");
}

function bindEvents() {
  // Toggle form salvataggio
  document.getElementById("ss-save-btn").addEventListener("click", () => {
    document.getElementById("ss-save-collapsed").classList.add("hidden");
    document.getElementById("ss-save-expanded").classList.remove("hidden");
    document.getElementById("ss-session-name").focus();
  });

  document.getElementById("ss-save-cancel").addEventListener("click", () => {
    document.getElementById("ss-save-collapsed").classList.remove("hidden");
    document.getElementById("ss-save-expanded").classList.add("hidden");
    document.getElementById("ss-session-name").value = "";
  });

  document.getElementById("ss-save-confirm").addEventListener("click", async () => {
    const name = document.getElementById("ss-session-name").value.trim();
    const color = getSelectedColor();
    await browser.runtime.sendMessage({ action: "save-session", name, color });
    await loadSessions();
    // Reset form
    document.getElementById("ss-save-collapsed").classList.remove("hidden");
    document.getElementById("ss-save-expanded").classList.add("hidden");
    document.getElementById("ss-session-name").value = "";
  });

  // Enter per salvare
  document.getElementById("ss-session-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("ss-save-confirm").click();
    if (e.key === "Escape") document.getElementById("ss-save-cancel").click();
  });

  // Delegazione eventi sulla lista
  document.getElementById("ss-sessions-list").addEventListener("click", async (e) => {
    const restoreBtn = e.target.closest(".ss-restore-btn");
    const menuBtn = e.target.closest(".ss-menu-btn");
    const menuItem = e.target.closest(".ss-menu-item");

    if (restoreBtn) {
      await browser.runtime.sendMessage({
        action: "restore-session",
        sessionId: restoreBtn.dataset.id
      });
      window.close(); // Chiudi popup dopo ripristino
    }

    if (menuBtn) {
      toggleContextMenu(menuBtn.dataset.id);
    }

    if (menuItem) {
      await handleMenuAction(menuItem.dataset.action, menuItem.closest(".ss-context-menu").dataset.id);
    }
  });
}

async function handleMenuAction(action, sessionId) {
  if (action === "update") {
    await browser.runtime.sendMessage({ action: "update-session", sessionId });
    await loadSessions();
  }
  if (action === "rename") {
    startInlineRename(sessionId);
  }
  if (action === "delete") {
    if (confirm("Eliminare questa sessione?")) {
      await browser.runtime.sendMessage({ action: "delete-session", sessionId });
      await loadSessions();
    }
  }
}
```

### 8.6 Utility: formattazione data relativa

```javascript
function formatAge(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Salvata ora";
  if (minutes < 60) return `Salvata ${minutes} min fa`;
  if (hours < 24) return `Salvata oggi, ${new Date(timestamp).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
  if (days === 1) return `Salvata ieri`;
  if (days < 7) return `Salvata ${days} giorni fa`;
  return `Salvata il ${new Date(timestamp).toLocaleDateString("it-IT")}`;
}
```

---

## 9. Stili CSS (`popup/popup.css`)

### 9.1 Variabili e reset

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --ss-bg: #ffffff;
  --ss-bg-secondary: #f6f8fa;
  --ss-border: #d0d7de;
  --ss-text-primary: #24292f;
  --ss-text-secondary: #57606a;
  --ss-accent: #0969da;
  --ss-accent-hover: #0550ae;
  --ss-danger: #cf222e;
  --ss-hover: #f3f4f6;
  --ss-radius: 8px;
  --ss-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --ss-bg: #1c1e23;
    --ss-bg-secondary: #282b33;
    --ss-border: #3d4147;
    --ss-text-primary: #e6edf3;
    --ss-text-secondary: #8b949e;
    --ss-accent: #58a6ff;
    --ss-accent-hover: #79b8ff;
    --ss-danger: #ff7b72;
    --ss-hover: #2d3139;
  }
}

body {
  width: 360px;
  min-height: 200px;
  max-height: 520px;
  background: var(--ss-bg);
  color: var(--ss-text-primary);
  font-family: var(--ss-font);
  font-size: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
```

### 9.2 Header

```css
#ss-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ss-border);
  background: var(--ss-bg);
}

#ss-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}
```

### 9.3 Sezione salvataggio

```css
#ss-save-section {
  padding: 12px 16px;
  border-bottom: 1px solid var(--ss-border);
}

#ss-save-btn {
  width: 100%;
  padding: 8px 12px;
  background: var(--ss-accent);
  color: white;
  border: none;
  border-radius: var(--ss-radius);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
  transition: background 0.15s;
}

#ss-save-btn:hover {
  background: var(--ss-accent-hover);
}

#ss-session-name {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--ss-border);
  border-radius: var(--ss-radius);
  background: var(--ss-bg);
  color: var(--ss-text-primary);
  font-size: 14px;
  margin-bottom: 10px;
  outline: none;
}

#ss-session-name:focus {
  border-color: var(--ss-accent);
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15);
}

#ss-save-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
```

### 9.4 Lista sessioni

```css
#ss-sessions-section {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

#ss-sessions-header {
  padding: 10px 16px 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ss-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ss-session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: default;
  border-bottom: 1px solid var(--ss-border);
  transition: background 0.1s;
  position: relative;
}

.ss-session-item:hover {
  background: var(--ss-hover);
}

.ss-session-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ss-session-info {
  flex: 1;
  min-width: 0;
}

.ss-session-name {
  font-weight: 500;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ss-session-meta {
  font-size: 12px;
  color: var(--ss-text-secondary);
  margin-top: 2px;
}

.ss-session-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.1s;
}

.ss-session-item:hover .ss-session-actions {
  opacity: 1;
}

.ss-restore-btn {
  padding: 4px 10px;
  background: var(--ss-accent);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.ss-menu-btn {
  padding: 4px 6px;
  background: transparent;
  border: 1px solid var(--ss-border);
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  color: var(--ss-text-secondary);
}
```

---

## 10. Comportamenti Funzionali Dettagliati

### 10.1 Salvataggio sessione

| Step | Dettaglio |
|------|-----------|
| 1 | L'utente clicca "+ Salva sessione corrente" |
| 2 | Si espande il form con campo nome e color picker |
| 3 | L'utente digita il nome e opzionalmente sceglie un colore |
| 4 | Click "Salva" o Enter |
| 5 | Il background cattura tutte le schede della finestra corrente |
| 6 | Per ogni scheda, richiede la posizione di scroll al content script |
| 7 | Salva tutto in storage.local |
| 8 | La lista si aggiorna mostrando la nuova sessione in cima |

**Comportamento se nome già esistente:** aggiunge suffisso numerico automatico (es. "Progetto A (2)")

**Schede escluse dal salvataggio:**
- `about:newtab`, `about:blank`, `about:home`
- `moz-extension://` (pagine di altre estensioni)
- Schede in stato di caricamento (usare URL corrente se disponibile)

### 10.2 Ripristino sessione

| Step | Dettaglio |
|------|-----------|
| 1 | L'utente clicca ▶ su una sessione |
| 2 | Si apre una **nuova finestra** Firefox (non tocca quella corrente) |
| 3 | Le schede si aprono nell'ordine originale |
| 4 | La scheda attiva al momento del salvataggio è quella attiva |
| 5 | Le schede pinnate vengono pinnate |
| 6 | Quando ogni scheda finisce di caricare, lo scroll viene ripristinato |
| 7 | Il popup si chiude |

**Gestione URL non più raggiungibili:** se un URL restituisce errore, la scheda si apre comunque mostrando la pagina di errore del browser (comportamento nativo).

### 10.3 Aggiornamento sessione

L'utente ha lavorato su un progetto e vuole salvare il nuovo stato:

1. Click `⋮` sulla sessione → "Aggiorna con schede correnti"
2. Il sistema sovrascrive tabs e scroll con la finestra **correntemente attiva**
3. Nome, colore e data di creazione rimangono invariati
4. `updatedAt` viene aggiornato
5. Feedback visivo nella lista (es. "Aggiornata ora")

### 10.4 Rename inline

1. Click `⋮` → "Rinomina"
2. Il nome nella lista diventa un `<input>` in-place
3. L'utente modifica il testo
4. Enter o click fuori per confermare, Esc per annullare

### 10.5 Eliminazione

1. Click `⋮` → "Elimina"
2. Dialogo di conferma nativo (`confirm()`)
3. Se confermato: rimuove da storage, aggiorna lista
4. Nessuna operazione di undo (v1.0)

---

## 11. Gestione Edge Cases

| Caso | Comportamento |
|------|---------------|
| Pagina con scroll non rilevabile (iframe, SPA) | Scroll salvato come 0,0 |
| URL `about:`, `moz-extension:` | Scheda esclusa dal salvataggio |
| PDF aperto nel browser | Scroll non ripristinabile, URL salvato correttamente |
| Finestra con 0 schede valide | Impedisce il salvataggio, mostra errore |
| Storage pieno (>10MB) | Mostra messaggio di errore, suggerisce di eliminare sessioni vecchie |
| Content script non iniettato | Scroll salvato come 0,0 silenziosamente |
| Scheda in caricamento al ripristino scroll | Listener `tabs.onUpdated` attende `status === "complete"` |

---

## 12. Icone

Stesso approccio del progetto Quick Actions Launcher. PNG in 4 dimensioni: 16×16, 32×32, 48×48, 96×96.

**Design suggerito:** icona di una fotocamera stilizzata o stack di rettangoli (rappresentano schede) con un segno di spunta o pin, colore primario `#0969da`.

---

## 13. Requisiti Non Funzionali

| Requisito | Valore target |
|-----------|--------------|
| Tempo di salvataggio sessione | < 500ms per finestre con ≤20 schede |
| Tempo di ripristino (apertura finestra) | < 1s per la prima scheda |
| Compatibilità Firefox | 91+ |
| Persistenza dati | Permanente (storage.local, sopravvive al riavvio) |
| Limite sessioni | Nessun limite artificiale (limitato da storage ~10MB) |

---

## 14. Fuori Scope (v1.0)

- Sincronizzazione tra dispositivi (`storage.sync` ha quota troppo bassa per URL multipli)
- Export/import sessioni come file JSON
- Anteprima delle schede al hover
- Ordinamento e filtro della lista sessioni
- Gruppi o cartelle di sessioni
- Undo dell'eliminazione
- Apertura sessione in finestra privata
- Condivisione sessioni tra utenti

---

## 15. Checklist di Completamento

- [ ] `manifest.json` valido con permessi `tabs`, `windows`, `storage`
- [ ] Background script: salvataggio sessione con scroll capture
- [ ] Background script: ripristino in nuova finestra
- [ ] Background script: eliminazione e rename
- [ ] Background script: aggiornamento sessione esistente
- [ ] Background script: ripristino scroll post-caricamento (`tabs.onUpdated`)
- [ ] Content script: risponde a `get-scroll` e `restore-scroll`
- [ ] Popup: lista sessioni con data relativa
- [ ] Popup: form salvataggio con nome e color picker
- [ ] Popup: pulsante ripristina (▶)
- [ ] Popup: menu contestuale (aggiorna, rinomina, elimina)
- [ ] Popup: rename inline
- [ ] Popup: empty state
- [ ] CSS dark/light mode
- [ ] Esclusione URL `about:` e `moz-extension:` dal salvataggio
- [ ] Gestione errori content script non disponibile
- [ ] Icone in 4 dimensioni
- [ ] Test su Firefox 91+

---

*Documento generato per implementazione autonoma tramite Claude Code.*
