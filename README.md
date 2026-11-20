# Bookmark Organizer

**English** · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [हिन्दी](README.hi.md) · [العربية](README.ar.md)

Clean up and organize your browser bookmarks, by hand or by asking an AI assistant to do it for you.

The project has three parts:

| Part | For whom | What it does |
|---|---|---|
| **[Web tool](https://dpfcarlos.github.io/bookmark-organizer/)** | Anyone | A single page that runs in your browser. Load your exported bookmarks, remove duplicates and empty folders, group links by site, sort, move, rename, delete, then download a clean file. Nothing is uploaded. |
| **MCP server** | People using Claude Desktop, Claude Code, Cursor, VS Code or any MCP client | Lets the AI read and change the bookmarks of Chrome, Edge, Brave, Vivaldi, Opera and Chromium directly on your computer: list, search, find duplicates and broken links, reorganize into folders, export, delete everything and load a new set, restore backups. |
| **Skill** (`organize-bookmarks`) | Same as above | Teaches the AI the safe way to do it: export a backup first, make sure the browser is closed, show a preview and only apply after you confirm. |

## 1. Web tool (no installation)

Open **https://dpfcarlos.github.io/bookmark-organizer/** (or download [`docs/index.html`](docs/index.html) and open it).

1. **Export** your bookmarks: in Chrome/Edge/Brave press `Ctrl+Shift+O`, open the ⋮ menu and choose *Export bookmarks*. In Firefox: `Ctrl+Shift+O` → *Import and Backup* → *Export Bookmarks to HTML*.
2. **Organize** the file in the page (available in English, Português, Español, Français, Deutsch, Italiano, Русский, 简体中文, 日本語, 한국어, हिन्दी and العربية; the language is picked from your browser and can be changed at the top). Several files can be loaded at once and are merged.
3. **Load the clean file**: delete the old bookmarks in the browser (select all with `Ctrl+A` in the bookmarks manager, then `Delete`) and use *Import bookmarks* with the downloaded file.

Keep the original export: it is your backup.

## 2. Let the AI do it (MCP server + skill)

Requirements: [Node.js](https://nodejs.org) 18 or newer. The server runs **on your computer**, because that is where your bookmarks are, so it works with desktop apps (Claude Desktop, Claude Code, Cursor, VS Code…), not with a chat that runs only in the cloud.

### Claude Code (plugin: MCP server + skill in one step)

```
/plugin marketplace add dpfcarlos/bookmark-organizer
/plugin install bookmark-organizer@bookmark-organizer
```

Only the MCP server:

```bash
claude mcp add bookmark-organizer -- npx -y github:dpfcarlos/bookmark-organizer
```

### Claude Desktop

Open *Settings → Developer → Edit Config* and add to `claude_desktop_config.json`:

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

Restart Claude Desktop. To add the skill, download [`skills/organize-bookmarks`](skills/organize-bookmarks) as a .zip and upload it in *Settings → Capabilities → Skills*.

### Cursor, VS Code, Windsurf and other MCP clients

Use the same command in the client's MCP settings: `npx -y github:dpfcarlos/bookmark-organizer` (stdio).

### What to ask

- "Organize my Chrome bookmarks into folders by topic."
- "Remove duplicate bookmarks and empty folders in Edge."
- "Find bookmarks whose links are broken."
- "Export my bookmarks, delete them all and load this cleaned file: C:\Users\me\Downloads\bookmarks-organized.html"
- "Undo the last change."

## MCP tools

| Tool | What it does | Changes the browser? |
|---|---|---|
| `list_profiles` | Browsers and profiles found, counts, whether the browser is open | no |
| `stats` | Totals, duplicates, empty folders, top domains, top folders | no |
| `get_bookmarks` / `search_bookmarks` | List or search with ids and folder paths | no |
| `find_duplicates` | Same page saved more than once (ignores http/https, www, `#`, `utm_*`) | no |
| `check_links` | Finds dead links (404, domain gone); sites that block bots are reported as "uncertain" | no |
| `export_html` / `preview_html` | Standard bookmarks HTML that any browser imports / preview a file | no |
| `backup` / `list_backups` / `restore_backup` | Backups and undo | restore only |
| `delete_bookmarks`, `remove_duplicates`, `remove_empty_folders` | Clean up | yes |
| `create_folder`, `add_bookmark`, `move_bookmarks`, `rename`, `sort_folder` | Reorganize | yes |
| `delete_all_bookmarks` | Empty everything | yes |
| `import_html` | Load a file, appending into a folder or replacing everything | yes |

## Safety

- **Dry run by default.** Every tool that changes something only shows what would happen until it is called with `dry_run: false`.
- **Automatic backup** before every change, in `~/.bookmark-organizer/backups` (change with the `BOOKMARK_ORGANIZER_BACKUPS` environment variable). `restore_backup` undoes any change.
- **Refuses to write while the browser is open**, because the browser would overwrite the file when closing.
- **Sync:** if bookmark sync is on, the sync server can bring deleted items back after a direct edit. For a big cleanup with sync on, prefer the flow *export → organize → delete all in the browser → import the clean file*, which the skill explains.
- Firefox and Safari are not edited directly; use their HTML export with the web tool or `import_html`.

Settings via environment variables: `BOOKMARKS_FILE` (path to a specific `Bookmarks` file) and `BOOKMARK_ORGANIZER_BACKUPS` (backup folder).

## Development

```bash
npm install
npm test
```

The tests create a fake Chrome profile and drive the MCP server end to end, the same way an AI client does.

## License

MIT. Contributions are welcome.
