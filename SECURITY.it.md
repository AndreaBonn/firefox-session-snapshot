[English](SECURITY.md) | **Italiano**

## Versioni supportate

Questo progetto e in sviluppo attivo. Gli aggiornamenti di sicurezza vengono applicati all'ultimo commit su `main`.

## Segnalare una vulnerabilita

Per segnalare una vulnerabilita di sicurezza, usa [GitHub Security Advisories](https://github.com/AndreaBonn/firefox-session-snapshot/security/advisories/new).

Includi:

- Descrizione della vulnerabilita
- Passaggi per riprodurla
- Comportamento atteso vs comportamento effettivo
- Valutazione dell'impatto (cosa potrebbe ottenere un attaccante)

**Tempi di risposta:**

- Presa in carico: entro 72 ore
- Fix per problemi critici: entro 30 giorni
- Disclosure pubblica coordinata dopo il rilascio del fix

## Misure di sicurezza implementate

- **Validazione input**: i nomi delle sessioni sono sanitizzati e troncati a 100 caratteri. I valori di scroll sono limitati a un intervallo sicuro. I tag sono sanitizzati, convertiti in minuscolo e limitati a 5 per sessione con massimo 20 caratteri ciascuno (`background/validation.js`).
- **Validazione ID sessione**: gli ID vengono validati con un pattern rigoroso prima di qualsiasi operazione di modifica (`background/validation.js`, `background/background.js`).
- **Filtro URL**: solo gli schemi `https:`, `http:`, `ftp:` e `file:` sono consentiti nel ripristino delle schede. Gli URL interni (`about:`, `moz-extension:`) sono esclusi dalle sessioni salvate. Le URL dei favicon importati sono filtrate con la stessa allowlist (`background/validation.js`, `background/export-import.js`).
- **Validazione import**: i dati JSON importati sono validati per struttura, tipi e limiti di dimensione. Gli ID sessione vengono rigenerati per prevenire collisioni. I nomi sono sanitizzati e deduplicati. Le schede con schemi URL non consentiti vengono rifiutate (`background/export-import.js`).
- **Protezione content script**: le azioni di modifica (`save-session`, `restore-session`, `delete-session`, `schedule-delete`, `cancel-delete`, `rename-session`, `update-session`, `update-session-tags`, `import-sessions`) inviate dai content script vengono rifiutate (`background/background.js`).
- **Content Security Policy**: `script-src 'self'; style-src 'self'; object-src 'self'` (`manifest.json`).
- **Escaping output**: l'output HTML nel popup usa `escapeHtml()` per prevenire XSS. I tag sono escaped prima del rendering (`popup/ui-utils.js`, `popup/tags.js`).
- **Validazione colori**: i valori esadecimali dei colori sono validati con un pattern rigoroso prima dell'uso (`background/validation.js`).
- **Dipendenze fissate**: `package-lock.json` committato nel repository.

## Fuori ambito

I seguenti casi non sono considerati vulnerabilita per questo progetto:

- Self-XSS (attacchi che richiedono alla vittima di incollare codice nella propria console)
- Attacchi di ingegneria sociale
- Vulnerabilita in dipendenze di terze parti gia divulgate pubblicamente (segnalarle al maintainer upstream)
- Denial of service tramite uso legittimo eccessivo

## Riconoscimenti

I ricercatori di sicurezza che hanno segnalato vulnerabilita in modo responsabile saranno elencati qui.

---

[Torna al README](./README.it.md)
