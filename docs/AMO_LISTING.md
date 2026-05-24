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
Save and restore browser sessions by project. Each session remembers your tabs and scroll positions, and auto-syncs changes in restored windows.
```

### Sommario IT (se listing multilingua)

```
Salva e ripristina sessioni del browser per progetto. Ogni sessione ricorda schede e posizione di scroll, e sincronizza automaticamente le modifiche.
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
- Search and filter your saved sessions by name
- Inline rename with automatic duplicate handling
- Undo on delete via toast notification
- Light and dark theme following your system preference
- Keyboard shortcuts: Ctrl+Shift+S (quick save), Ctrl+Shift+W (open popup)

HOW IT WORKS

1. Click the Session Snapshot icon or press Ctrl+Shift+W
2. Click "Save current session" and give it a name
3. Your tabs and their scroll positions are saved locally
4. Click "Restore" on any session to open it in a new window
5. Changes in the restored window are tracked and saved automatically

PRIVACY

All data stays on your device. No servers, no analytics, no tracking. The extension uses browser.storage.local exclusively. See the full privacy policy in the repository.

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
- Cerca e filtra le sessioni salvate per nome
- Rinomina inline con gestione automatica dei duplicati
- Annulla eliminazione tramite notifica toast
- Tema chiaro e scuro che segue le preferenze di sistema
- Scorciatoie da tastiera: Ctrl+Shift+S (salvataggio rapido), Ctrl+Shift+W (apri popup)

COME FUNZIONA

1. Clicca l'icona Session Snapshot o premi Ctrl+Shift+W
2. Clicca "Salva sessione corrente" e assegna un nome
3. Le schede e le posizioni di scroll vengono salvate localmente
4. Clicca "Ripristina" su qualsiasi sessione per aprirla in una nuova finestra
5. Le modifiche nella finestra ripristinata vengono tracciate e salvate automaticamente

PRIVACY

Tutti i dati restano sul tuo dispositivo. Nessun server, nessuna analisi, nessun tracciamento. L'estensione usa esclusivamente browser.storage.local. La privacy policy completa e disponibile nel repository.

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
tabs, session, session-manager, save-tabs, restore-tabs, scroll-position, tab-groups, productivity, workspace, auto-sync, dark-theme, keyboard-shortcuts, tab-manager, session-restore, bookmark-alternative
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

- Screenshot del context menu (rename/delete/color)
- Screenshot della ricerca sessioni con risultati filtrati
- Screenshot del toast con undo
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
1.1.0
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

SOURCE CODE: https://github.com/AndreaBonn/firefox-session-snapshot
All source is unminified and readable. No build step required.

TEST SUITE: npm test (Jest, 85%+ coverage)
```

---

## 10. Checklist pre-submission

- [ ] Icona 128x128px (attualmente 96x96, da verificare se sufficiente)
- [ ] Screenshot aggiornati e con didascalie
- [ ] Privacy policy pubblicata su GitHub (PRIVACY_POLICY.md)
- [ ] CHANGELOG.md aggiornato
- [ ] Versione manifest.json allineata con AMO listing
- [ ] gecko.id nel manifest (`session-snapshot@andreabonacci95.protonmail.com`) - formato email OK
- [ ] Testare con `web-ext lint` per validazione automatica
- [ ] Creare pacchetto .zip (escludere: node_modules, tests, .git, docs, badges, .github)
- [ ] Testare il .zip con "Load Temporary Add-on" prima di caricare su AMO

---

## 11. Comando per creare il pacchetto .zip

```bash
# Dalla root del progetto
zip -r session-snapshot-1.1.0.zip \
  manifest.json \
  background/ \
  content/ \
  popup/ \
  icons/ \
  LICENSE \
  -x "*.DS_Store"
```

Oppure con web-ext (raccomandato):

```bash
npx web-ext build --source-dir=. --artifacts-dir=./dist \
  --ignore-files="tests/**" "docs/**" "badges/**" ".github/**" \
  "node_modules/**" "package*.json" ".eslint*" ".prettier*" \
  "*.md" ".gitignore" "dist/**"
```
