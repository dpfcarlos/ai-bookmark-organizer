# Bookmark Organizer (Organizzatore di Preferiti)

[English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · **Italiano** · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [हिन्दी](README.hi.md) · [العربية](README.ar.md)

Pulisci e organizza i preferiti del tuo browser, da solo o chiedendo a un'IA di farlo per te.

Il progetto ha tre parti:

- **[Strumento web](https://dpfcarlos.github.io/bookmark-organizer/)**: una pagina che funziona nel tuo browser. Carichi i preferiti esportati, rimuovi duplicati e cartelle vuote, raggruppi i link per sito, ordini, sposti, rinomini ed elimini, poi scarichi un file pulito. Nulla viene inviato in rete.
- **Server MCP**: permette all'IA di leggere e modificare i preferiti di Chrome, Edge, Brave, Vivaldi, Opera e Chromium direttamente sul tuo computer: elencare, cercare, trovare duplicati e link non funzionanti, riorganizzare in cartelle, esportare, eliminare tutto e caricare un nuovo insieme, ripristinare i backup.
- **Skill** (`organize-bookmarks`): insegna all'IA a procedere in sicurezza: prima il backup, verifica che il browser sia chiuso, anteprima e applicazione solo dopo la tua conferma.

## 1. Strumento web (senza installazione)

Apri **https://dpfcarlos.github.io/bookmark-organizer/** (oppure scarica [`docs/index.html`](docs/index.html) e aprilo).

1. **Esporta** i preferiti: in Chrome, Edge o Brave premi `Ctrl+Maiusc+O`, apri il menu ⋮ e scegli *Esporta preferiti*. In Firefox: `Ctrl+Maiusc+O` → *Importa e salva* → *Esporta segnalibri in HTML*.
2. **Organizza** il file nella pagina. Puoi caricare più file insieme e vengono uniti.
3. **Carica il file pulito**: elimina i vecchi preferiti nel browser (`Ctrl+A` e poi `Canc` nella gestione dei preferiti) e usa *Importa preferiti* con il file scaricato.

Conserva l'esportazione originale: è il tuo backup.

## 2. Lascia fare all'IA (server MCP + skill)

Requisito: [Node.js](https://nodejs.org) 18 o successivo. Il server gira **sul tuo computer**, dove si trovano i preferiti; funziona quindi con le app desktop (Claude Desktop, Claude Code, Cursor, VS Code…), non con una chat che gira solo nel cloud.

### Claude Code (plugin: server MCP e skill in un solo passaggio)

```
/plugin marketplace add dpfcarlos/bookmark-organizer
/plugin install bookmark-organizer@bookmark-organizer
```

Solo il server MCP:

```bash
claude mcp add bookmark-organizer -- npx -y github:dpfcarlos/bookmark-organizer
```

### Claude Desktop

Apri *Settings → Developer → Edit Config* e aggiungi a `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bookmark-organizer": {
      "command": "npx",
      "args": ["-y", "github:dpfcarlos/bookmark-organizer"]
    }
  }
}
```

Riavvia Claude Desktop. Per aggiungere la skill scarica la cartella [`skills/organize-bookmarks`](skills/organize-bookmarks) come .zip e caricala in *Settings → Capabilities → Skills*.

### Cursor, VS Code, Windsurf e altri client MCP

Usa lo stesso comando nelle impostazioni MCP del programma: `npx -y github:dpfcarlos/bookmark-organizer` (stdio).

### Esempi di richieste

- "Organizza i preferiti del mio Chrome in cartelle per argomento."
- "Rimuovi i preferiti duplicati e le cartelle vuote in Edge."
- "Trova i preferiti con link non funzionanti."
- "Esporta i miei preferiti, eliminali tutti e carica questo file pulito: C:\Users\io\Downloads\bookmarks-organized.html"
- "Annulla l'ultima modifica."

## Sicurezza

- **Simulazione predefinita.** Gli strumenti che modificano qualcosa mostrano solo cosa farebbero finché non vengono chiamati con `dry_run: false`.
- **Backup automatico** prima di ogni modifica, in `~/.bookmark-organizer/backups`. `restore_backup` annulla qualsiasi modifica.
- **Nessuna scrittura con il browser aperto**, perché il browser sovrascriverebbe il file alla chiusura.
- **Sincronizzazione:** se attiva, il server può riportare gli elementi eliminati. Per una pulizia grande è meglio *esportare → organizzare → eliminare tutto nel browser → importare il file pulito*.
- Firefox e Safari non vengono modificati direttamente: usa la loro esportazione HTML con lo strumento web o `import_html`.

L'elenco completo degli strumenti MCP è nel [README in inglese](README.md#mcp-tools).

---

Licenza MIT. I contributi sono benvenuti.
