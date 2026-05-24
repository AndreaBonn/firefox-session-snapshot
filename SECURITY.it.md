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

- **Validazione input**: i nomi delle sessioni sono sanitizzati e troncati a 100 caratteri (`background/validation.js:30-33`). I valori di scroll sono limitati a un intervallo sicuro (`background/validation.js:35-39`).
- **Validazione ID sessione**: gli ID vengono validati con un pattern rigoroso prima di qualsiasi operazione di modifica (`background/validation.js:22-24`, `background/background.js:432-438`).
- **Filtro URL**: solo gli schemi `https:`, `http:`, `ftp:` e `file:` sono consentiti nel ripristino delle schede. Gli URL interni (`about:`, `moz-extension:`) sono esclusi dalle sessioni salvate (`background/validation.js:41-52`).
- **Protezione content script**: le azioni di modifica (`save-session`, `restore-session`, `delete-session`, `rename-session`, `update-session`) inviate dai content script vengono rifiutate (`background/background.js:422-429`).
- **Content Security Policy**: `script-src 'self'; style-src 'self'; object-src 'self'` (`manifest.json:18`).
- **Escaping output**: l'output HTML nel popup usa `escapeHtml()` per prevenire XSS (`popup/ui-utils.js:15-18`, `popup/toast.js:21`).
- **Validazione colori**: i valori esadecimali dei colori sono validati con un pattern rigoroso prima dell'uso (`background/validation.js:26-28`).
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
