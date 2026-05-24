# AMO Listing - Campi per la pubblicazione su addons.mozilla.org

Documento di riferimento con tutti i campi da compilare per la submission su AMO.

---

## 1. Informazioni di base

### Nome estensione

```
Session Snapshot
```

### Slug URL (opzionale, default dal nome)

```
session-snapshot
```

### Sommario (max 250 caratteri)

```
Save and restore browser sessions by project. Each session remembers tabs, scroll positions, and tags. Export/import for backup. Auto-syncs changes in restored windows.
```

### Sommario IT (se listing multilingua)

```
Salva e ripristina sessioni del browser per progetto. Ogni sessione ricorda schede, scroll e tag. Export/import per backup. Sincronizza automaticamente le modifiche.
```

---

## 2. Descrizione completa

### English

```
Session Snapshot lets you save groups of tabs as named sessions and restore them later in a dedicated window - with scroll positions preserved.

FEATURES

- Save all tabs from the current window as a named, color-coded session
- Restore sessions in a separate window with scroll positions intact
- Auto-sync: restored windows track tab changes (open, close, navigate) and update the session automatically
- Tag sessions with labels for organization, searchable from the filter bar
- Export all sessions (or a single one) as JSON for backup and migration
- Import sessions from a JSON file with validation and duplicate name handling
- Search and filter saved sessions by name or tag
- Inline rename with automatic duplicate handling
- Undo on delete via toast notification - works even if the popup is closed
- Storage usage indicator in the popup footer
- Light and dark theme following your system preference
- Keyboard shortcuts: Ctrl+Shift+S (quick save), Ctrl+Shift+W (open popup)

HOW IT WORKS

1. Click the Session Snapshot icon or press Ctrl+Shift+W
2. Click "Save current session", give it a name, choose a color and add tags
3. Your tabs and their scroll positions are saved locally
4. Click "Restore" on any session to open it in a new window
5. Changes in the restored window are tracked and saved automatically

EXPORT / IMPORT

Use the arrow buttons in the header to export all sessions as a JSON file or import from a previously exported file. You can also export a single session from its context menu. This is useful for backups, migrating between Firefox profiles, or sharing session setups.

PRIVACY

All data stays on your device. No servers, no analytics, no tracking. The extension uses browser.storage.local exclusively. Export/import works with local files only. See the full privacy policy in the repository.

PERMISSIONS

- tabs: read open tabs to save sessions
- storage: store sessions locally
- activeTab: access the current tab when saving
- windows: create windows for restored sessions
- Content script on all pages: capture and restore scroll positions
```

### Italiano

```
Session Snapshot ti permette di salvare gruppi di schede come sessioni con nome e ripristinarle in una finestra dedicata, con le posizioni di scroll preservate.

FUNZIONALITA

- Salva tutte le schede della finestra corrente come sessione con nome e colore
- Ripristina sessioni in una finestra separata con posizioni di scroll intatte
- Auto-sync: le finestre ripristinate tracciano le modifiche (apertura, chiusura, navigazione) e aggiornano la sessione automaticamente
- Etichetta le sessioni con tag per organizzarle, cercabili dalla barra di filtro
- Esporta tutte le sessioni (o una singola) come JSON per backup e migrazione
- Importa sessioni da file JSON con validazione e gestione nomi duplicati
- Cerca e filtra le sessioni salvate per nome o tag
- Rinomina inline con gestione automatica dei duplicati
- Annulla eliminazione tramite notifica toast - funziona anche se il popup viene chiuso
- Indicatore spazio storage nel footer del popup
- Tema chiaro e scuro che segue le preferenze di sistema
- Scorciatoie da tastiera: Ctrl+Shift+S (salvataggio rapido), Ctrl+Shift+W (apri popup)

COME FUNZIONA

1. Clicca l'icona Session Snapshot o premi Ctrl+Shift+W
2. Clicca "Salva sessione corrente", assegna un nome, scegli un colore e aggiungi tag
3. Le schede e le posizioni di scroll vengono salvate localmente
4. Clicca "Ripristina" su qualsiasi sessione per aprirla in una nuova finestra
5. Le modifiche nella finestra ripristinata vengono tracciate e salvate automaticamente

ESPORTA / IMPORTA

Usa i pulsanti freccia nell'header per esportare tutte le sessioni come file JSON o importare da un file esportato in precedenza. Puoi anche esportare una singola sessione dal menu contestuale. Utile per backup, migrazione tra profili Firefox o condivisione di configurazioni.

PRIVACY

Tutti i dati restano sul tuo dispositivo. Nessun server, nessuna analisi, nessun tracciamento. L'estensione usa esclusivamente browser.storage.local. Export/import funziona solo con file locali. La privacy policy completa e disponibile nel repository.

PERMESSI

- tabs: leggere le schede aperte per salvare sessioni
- storage: salvare sessioni localmente
- activeTab: accedere alla scheda corrente durante il salvataggio
- windows: creare finestre per le sessioni ripristinate
- Content script su tutte le pagine: catturare e ripristinare posizioni di scroll
```

---

## 3. Categoria AMO

```
Categoria primaria: Tabs
Categoria secondaria: Session Manager (se disponibile)
```

---

## 4. Tag (max 20)

```
tabs, session, session-manager, save-tabs, restore-tabs, scroll-position, tab-groups, productivity, workspace, auto-sync, dark-theme, keyboard-shortcuts, tab-manager, session-restore, export, import, backup, tags, labels
```

---

## 5. Screenshot

File gia presenti in `docs/assets/`:

| #   | File                       | Didascalia EN                                  | Didascalia IT                            |
| --- | -------------------------- | ---------------------------------------------- | ---------------------------------------- |
| 1   | `popup-sessions-light.png` | Session list with saved sessions (light theme) | Lista sessioni salvate (tema chiaro)     |
| 2   | `popup-sessions-dark.png`  | Session list with saved sessions (dark theme)  | Lista sessioni salvate (tema scuro)      |
| 3   | `popup-save-light.png`     | Save session form with color picker            | Form di salvataggio con selettore colore |

### Screenshot aggiuntivi consigliati

Considera di aggiungere:

- Screenshot con tag visibili sulle sessioni
- Screenshot del tag editor modale
- Screenshot dei bottoni export/import nell'header
- Screenshot del footer con indicatore storage
- Screenshot del context menu (rename/delete/export/tags)
- Screenshot della ricerca sessioni con risultati filtrati
- GIF/video breve del flusso save-restore completo

---

## 6. Icona AMO

```
File: icons/icon-96.png (minimo 128x128 raccomandato da AMO)
```

**NOTA:** AMO raccomanda icona 128x128px. Attualmente la massima disponibile e 96x96. Valutare se generare una versione 128x128.

---

## 7. Informazioni sviluppatore

### Homepage

```
https://github.com/AndreaBonn/firefox-session-snapshot
```

### URL supporto

```
https://github.com/AndreaBonn/firefox-session-snapshot/issues
```

### Licenza

```
Apache License 2.0
```

### Privacy Policy URL

```
https://github.com/AndreaBonn/firefox-session-snapshot/blob/main/PRIVACY_POLICY.md
```

---

## 8. Versione e compatibilita

### Versione

```
1.2.0
```

### Versione minima Firefox

```
91.0
```

### Manifest version

```
2
```

### Piattaforme

```
Firefox Desktop (tutte le piattaforme: Windows, macOS, Linux)
Firefox per Android: NO (popup UI non compatibile)
```

---

## 9. Note per il reviewer AMO

Testo da inserire nel campo "Notes to Reviewer" durante la submission:

```
This extension saves and restores browser tab sessions locally using browser.storage.local. No external network requests are made.

PERMISSIONS JUSTIFICATION:

- "tabs": Required to read tab URLs and titles when saving a session, and to create tabs when restoring.
- "storage": Required to persist saved sessions across browser restarts.
- "activeTab": Used to identify the current window's tabs during save.
- "windows": Required to create new windows when restoring sessions and to track restored windows for auto-sync.
- "<all_urls>" (content script): The content script (content/scroll-capture.js, 26 lines) only reads and restores scroll positions (window.scrollX/Y) on demand via message passing. It does not modify page content, access DOM elements, or make network requests.

ARCHITECTURE:
The background logic is split into 6 focused modules loaded via manifest background.scripts array (no bundler):
- validation.js: constants and input sanitization
- storage.js: low-level storage helpers
- session-crud.js: save, restore, delete, rename, update, tags
- auto-sync.js: tracked window sync and scroll restore
- export-import.js: JSON export/import with validation, storage stats
- background.js: message listener, deferred delete, keyboard shortcuts

EXPORT/IMPORT:
Sessions can be exported as JSON and imported from JSON files. All operations are local (file download / file picker). Import validates structure, regenerates IDs, sanitizes all fields, and filters disallowed URL schemes.

SOURCE CODE: https://github.com/AndreaBonn/firefox-session-snapshot
All source is unminified and readable. No build step required.

TEST SUITE: npm test (Jest, 154 tests)
```

---

## 10. Checklist pre-submission

- [ ] Icona 128x128px (attualmente 96x96, da verificare se sufficiente)
- [ ] Screenshot aggiornati con nuove feature (tag, export/import, storage indicator)
- [ ] Privacy policy aggiornata e pubblicata su GitHub (PRIVACY_POLICY.md)
- [ ] CHANGELOG.md aggiornato con v1.2.0
- [ ] Versione manifest.json allineata con AMO listing (1.2.0)
- [ ] gecko.id nel manifest (`session-snapshot@andreabonacci95.protonmail.com`) - formato email OK
- [ ] Testare con `web-ext lint` per validazione automatica
- [ ] Creare pacchetto .zip (escludere: node_modules, tests, .git, docs, badges, .github)
- [ ] Testare il .zip con "Load Temporary Add-on" prima di caricare su AMO

---

## 11. Comando per creare il pacchetto .zip

```bash
# Dalla root del progetto
zip -r session-snapshot-1.2.0.zip \
  manifest.json \
  background/ \
  content/ \
  popup/ \
  icons/ \
  LICENSE \
  -x "*.DS_Store" "**/.eslintrc.json"
```

Oppure con web-ext (raccomandato):

```bash
npx web-ext build --source-dir=. --artifacts-dir=./dist \
  --ignore-files="tests/**" "docs/**" "badges/**" ".github/**" \
  "node_modules/**" "package*.json" ".eslint*" ".prettier*" \
  "*.md" ".gitignore" "dist/**"
```
