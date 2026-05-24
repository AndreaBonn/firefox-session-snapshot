[English](README.md) | **Italiano**

# Session Snapshot

Un'estensione Firefox per salvare e ripristinare sessioni di lavoro nel browser. Ogni sessione cattura le schede aperte e la posizione di scroll, ripristinandole in una finestra dedicata con sincronizzazione automatica.

[![CI](https://github.com/AndreaBonn/firefox-session-snapshot/actions/workflows/ci.yml/badge.svg)](https://github.com/AndreaBonn/firefox-session-snapshot/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/AndreaBonn/firefox-session-snapshot/main/badges/test-badge.json)](https://github.com/AndreaBonn/firefox-session-snapshot/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/AndreaBonn/firefox-session-snapshot/main/badges/coverage-badge.json)](https://github.com/AndreaBonn/firefox-session-snapshot/actions/workflows/ci.yml)
![Licenza: Apache 2.0](https://img.shields.io/badge/licenza-Apache%202.0-blue)
![JavaScript](https://img.shields.io/badge/javascript-ES2020-f7df1e)
![Firefox](https://img.shields.io/badge/firefox-%3E%3D91-ff7139)
![Versione](https://img.shields.io/badge/versione-1.2.0-green)

|                      Tema chiaro                       |                      Tema scuro                      |
| :----------------------------------------------------: | :--------------------------------------------------: |
| ![Tema chiaro](./docs/assets/popup-sessions-light.png) | ![Tema scuro](./docs/assets/popup-sessions-dark.png) |

## Funzionalita

- Salva tutte le schede della finestra corrente come sessione con nome e colore
- Ripristina le sessioni in una finestra separata con posizione di scroll preservata
- Auto-sync: le finestre ripristinate tracciano le modifiche alle schede (aggiunta, rimozione, navigazione) e aggiornano la sessione automaticamente
- Etichetta le sessioni con tag per organizzarle, cercabili dalla barra di filtro
- Esporta tutte le sessioni (o una singola) come JSON per backup e migrazione
- Importa sessioni da file JSON con validazione e gestione nomi duplicati
- Ricerca e filtro delle sessioni salvate per nome o tag
- Rinomina inline con gestione automatica dei duplicati
- Supporto undo sulle azioni distruttive (eliminazione) tramite notifica toast - funziona anche se il popup viene chiuso
- Indicatore spazio storage nel footer del popup
- Tema chiaro e scuro seguendo la preferenza di sistema
- Scorciatoie tastiera: Ctrl+Shift+S (salvataggio rapido), Ctrl+Shift+W (apri popup)

## Architettura

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

L'estensione usa le API Manifest V2 di Firefox con tre livelli:

- **Popup** renderizza la lista sessioni, gestisce le interazioni utente e invia comandi al background script tramite `browser.runtime.sendMessage`.
- **Background** (event page, non persistente) gestisce il CRUD delle sessioni, traccia le finestre ripristinate per l'auto-sync e coordina cattura/ripristino dello scroll.
- **Content script** gira su tutte le pagine per leggere e ripristinare la posizione di scroll su richiesta.

### Flusso salvataggio e ripristino

```mermaid
sequenceDiagram
    participant U as Utente
    participant P as Popup
    participant B as Background
    participant C as Content Script
    participant S as browser.storage

    U->>P: click "Salva sessione"
    P->>B: sendMessage(save-session)
    B->>C: get-scroll (per scheda)
    C-->>B: {x, y}
    B->>S: salva sessione + indice
    S-->>B: ok
    B-->>P: {success, session}
    P-->>U: sessione in lista

    U->>P: click "Ripristina"
    P->>B: sendMessage(restore-session)
    B->>S: leggi sessione
    B->>B: crea finestra + schede
    B->>S: salva mappa scroll pendente
    B->>C: restore-scroll (al caricamento scheda)
    B-->>P: {success}
```

## Struttura del repository

```text
.
├── background/              # Logica sessioni (modulare)
│   ├── validation.js        # Costanti, sanitizzazione input, validazione URL e tag
│   ├── storage.js           # Helper storage lettura/scrittura
│   ├── session-crud.js      # Salva, ripristina, elimina, rinomina, aggiorna, tag
│   ├── auto-sync.js         # Sync finestre tracciate, ripristino scroll, event listener
│   ├── export-import.js     # Export/import JSON con validazione, statistiche storage
│   └── background.js        # Message listener, eliminazione differita, scorciatoie
├── content/
│   └── scroll-capture.js    # Get/restore posizione scroll via messaggi
├── popup/                   # UI popup dell'estensione
│   ├── popup.html           # Markup popup
│   ├── popup.js             # Lista sessioni, form salvataggio, context menu, rinomina
│   ├── popup.css            # Stili tema chiaro/scuro
│   ├── tags.js              # Input tag, editor tag modale
│   ├── export-import.js     # UI export/import, indicatore storage
│   ├── search.js            # Filtro sessioni per nome e tag in tempo reale
│   ├── toast.js             # Notifiche toast (undo e informative)
│   └── ui-utils.js          # Helper condivisi (escapeHtml, formatAge, colori)
├── icons/                   # Icone estensione (16/32/48/96/128px)
├── tests/                   # Test unitari Jest (jsdom)
├── manifest.json            # Manifest estensione (Manifest V2)
└── package.json             # Dipendenze dev e script
```

## Prerequisiti

- Firefox 91 o successivo
- Node.js 18+ (solo per sviluppo: linting e test)

## Installazione

1. Clona il repository:

```bash
git clone https://github.com/AndreaBonn/firefox-session-snapshot.git
cd firefox-session-snapshot
```

2. Installa le dipendenze di sviluppo:

```bash
npm install
```

3. Carica l'estensione in Firefox:
   - Apri `about:debugging#/runtime/this-firefox`
   - Clicca "Carica componente aggiuntivo temporaneo..."
   - Seleziona `manifest.json` dalla root del repository

L'estensione resta attiva fino alla chiusura di Firefox. Ripeti il passaggio 3 dopo ogni riavvio.

## Esecuzione locale

| Comando                 | Descrizione                 |
| ----------------------- | --------------------------- |
| `npm test`              | Esegui test (Jest, verbose) |
| `npm run test:coverage` | Test con report copertura   |
| `npm run lint`          | Lint con ESLint             |
| `npm run lint:fix`      | Lint con auto-fix           |
| `npm run format`        | Formatta con Prettier       |
| `npm run format:check`  | Verifica formattazione      |

## Testing

I test usano Jest con ambiente jsdom, nella cartella `tests/`. I file test rispecchiano i moduli sorgente:

- `background.test.js` - CRUD sessioni, message handler, auto-sync
- `popup.test.js` - rendering UI, interazioni utente
- `scroll-capture.test.js` - comportamento content script
- `search.test.js` - logica di filtro
- `toast.test.js` - notifiche toast e undo

## Sicurezza

Validazione input, filtro URL e output escaping sono implementati nell'estensione. Per dettagli e segnalazione vulnerabilita, consulta [SECURITY.md](./SECURITY.it.md).

## Licenza

Rilasciato sotto Apache License 2.0. Vedi [LICENSE](./LICENSE).

## Supporta il progetto

Se Session Snapshot ti e stato utile, lascia una [stella su GitHub](https://github.com/AndreaBonn/firefox-session-snapshot) - aiuta altri a scoprirlo.
