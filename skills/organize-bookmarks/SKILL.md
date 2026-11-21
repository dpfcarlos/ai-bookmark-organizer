---
name: organize-bookmarks
description: Organize, clean up, back up, export, delete and re-import the user's browser bookmarks (favorites) in Chrome, Edge, Brave, Vivaldi, Opera or Chromium, using the ai-bookmark-organizer MCP tools. Use when the user asks to organize, tidy, sort, deduplicate, categorize, export, import, wipe or restore their bookmarks/favorites ("favoritos", "marcadores"), or to find broken bookmark links.
---

# Organize browser bookmarks

You help the user tidy their browser bookmarks with the `ai-bookmark-organizer` MCP tools.
Bookmarks are personal and often years old, so the job is half organizing and half not losing anything.
Answer in the user's language.

## Golden rules

1. **Backup first, always.** Every write tool makes an automatic backup, but at the start also run `export_html` so the user has a file they can open and import anywhere. Tell them where it was saved.
2. **The browser must be closed** before any write. An open browser rewrites its bookmarks file when it closes and silently undoes the changes. If a write tool says the browser is open, ask the user to close it completely (on Windows also check the tray icon / "continue running background apps") and try again. Never pass `force: true` unless the user confirms the browser is really closed and the detection is wrong.
3. **Preview, then confirm.** Every write tool runs as a dry run by default. Show the user a short summary of what will change, wait for an explicit "yes", then call again with `dry_run: false`.
4. **Never delete on a guess.** Only `check_links` results marked DEAD are candidates for removal, and only after the user agrees. UNCERTAIN links (403, timeouts) usually just block bots.
5. **Do not invent ids.** Always take ids from `get_bookmarks`, `search_bookmarks`, `find_duplicates` or `stats`.

## Step by step

1. `list_profiles` - find the browser and profile. If there are several, ask which one (show browser + profile name + count).
2. `stats` - get the picture: totals, duplicates, empty folders, top domains, top-level folders. Summarize it in 3-5 lines.
3. `export_html` - safety copy. Mention the path.
4. Ask what the user wants. Offer the usual menu:
   - remove duplicates (`remove_duplicates`)
   - remove empty folders (`remove_empty_folders`)
   - find broken links (`check_links`, can take a few minutes for large collections)
   - reorganize into themed folders (see below)
   - sort alphabetically (`sort_folder`)
   - start from scratch: export → delete all → import a cleaned file (see below)
5. Apply each change with dry run → confirmation → `dry_run: false`.
6. Finish with `stats` again and tell the user to open the browser and check. Remind them that `restore_backup` (with a file from `list_backups`) undoes everything.

## Reorganizing into themed folders

1. Read the bookmarks with `get_bookmarks` (page with `offset` if needed; use `folders_only: true` first for big collections).
2. Propose a folder plan with **5 to 12 top-level categories** based on what the user actually saves (e.g. Work, Study, Finance, Shopping, News, Tools, Entertainment, Travel, Health, Government services). Respect folders the user already built on purpose; do not flatten them.
3. Show the plan as a short tree with counts and a few examples per folder. Ask for adjustments.
4. Apply with one `move_bookmarks` call per destination, using `target_path` such as `Bookmarks bar/Study/Python` (missing folders are created). Do the dry run for the first one, then apply all after the user approves the plan as a whole.
5. Clean up with `remove_empty_folders` and optionally `sort_folder`.

Keep the bookmarks bar short: it is what the user sees every day. Put the 5-10 most used items or folders there and everything else in "Other bookmarks" unless the user prefers otherwise.

## Export, delete, load a new set ("start from scratch")

Use this when the user wants a clean slate, wants to move bookmarks between browsers, or has **sync turned on** (with sync, direct edits can be brought back by the server; replacing everything is more reliable).

1. `export_html` - the full backup file.
2. Organize: either apply the tools above on the live profile, or let the user clean the exported file in the web tool (https://dpfcarlos.github.io/ai-bookmark-organizer/) and give you the downloaded file.
3. `preview_html` on the file that will be loaded, so the user sees what is coming.
4. `import_html` with `mode: "replace"` (dry run → confirm → apply). This wipes the current bookmarks and loads the file: its "bookmarks bar" folder goes to the bar, the rest to Other bookmarks.
   - If the user only wants to add a file (e.g. bookmarks from another browser), use `mode: "append"`; pages already saved are skipped.
5. If the user only asked to wipe everything, use `delete_all_bookmarks`, but only after step 1 and an explicit confirmation.

## Firefox and Safari

These browsers are not edited directly. Ask the user to export to HTML (Firefox: Ctrl+Shift+O → Import and Backup → Export Bookmarks to HTML; Safari: File → Export → Bookmarks), use `preview_html` and `import_html` to bring them into a Chromium browser, or point them to the web tool to clean the file and import it back.

## When the MCP tools are not available

Explain that the `ai-bookmark-organizer` MCP server is not installed and point to the installation section of https://github.com/dpfcarlos/ai-bookmark-organizer. Meanwhile the user can do everything by hand in the web tool: https://dpfcarlos.github.io/ai-bookmark-organizer/
