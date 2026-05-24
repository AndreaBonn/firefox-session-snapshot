# Session Snapshot

Estensione Firefox per salvare e ripristinare sessioni di lavoro. Ogni sessione memorizza le schede aperte e la posizione di scroll, ripristinabili in una nuova finestra separata.

## Requisiti

- Firefox 91+
- Node.js 18+ (solo per sviluppo: linting e test)

## Setup sviluppo

```bash
cd session-snapshot
npm install
```

## Caricare l'estensione in Firefox

1. Apri Firefox, vai a `about:debugging#/runtime/this-firefox`
2. Clicca "Carica componente aggiuntivo temporaneo..."
3. Seleziona il file `manifest.json` dalla cartella `session-snapshot/`
4. L'icona dell'estensione appare nella toolbar

L'estensione resta attiva fino alla chiusura di Firefox. Ripeti la procedura al riavvio.

## Comandi

```bash
npm test              # Esegui test
npm run test:coverage # Test con report copertura
npm run lint          # Lint del codice
npm run lint:fix      # Lint con autofix
npm run format        # Formatta il codice
npm run format:check  # Verifica formattazione
```

## Struttura

```
session-snapshot/
├── manifest.json          # Configurazione estensione (Manifest V2)
├── background/
│   └── background.js      # Logica sessioni, storage, message handler
├── popup/
│   ├── popup.html         # UI popup
│   ├── popup.js           # Rendering lista, form, context menu
│   └── popup.css          # Stili light/dark
├── content/
│   └── scroll-capture.js  # Cattura e ripristino scroll position
├── icons/                 # Icone estensione (16/32/48/96px)
└── tests/                 # Test unitari
```

## Shortcut tastiera

| Shortcut | Azione |
|----------|--------|
| Ctrl+Shift+S | Salvataggio rapido sessione (nome automatico) |
| Ctrl+Shift+W | Apri popup |
