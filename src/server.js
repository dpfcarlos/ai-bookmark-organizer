#!/usr/bin/env node
// Bookmark Organizer MCP server.
// Lets an AI assistant list, clean up, reorganize, export and import the bookmarks
// of Chromium-based browsers (Chrome, Edge, Brave, Vivaldi, Opera, Chromium).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { discoverProfiles, resolveProfile, isBrowserRunning } from './browsers.js';
import * as cr from './chromium.js';
import * as ns from './netscape.js';

const server = new McpServer({ name: 'bookmark-organizer', version: '1.0.0' });

const profileArg = z
  .string()
  .optional()
  .describe('Profile id from list_profiles (e.g. "chrome:Default", "edge:Profile 1") or the full path to a Bookmarks file. Optional when only one profile exists.');
const dryRunArg = z
  .boolean()
  .default(true)
  .describe('When true (default) nothing is written; the tool only reports what would change. Show that to the user and call again with dry_run=false after they confirm.');
const forceArg = z
  .boolean()
  .default(false)
  .describe('Write even if the browser seems to be open. Avoid: an open browser overwrites the file when it closes.');

const text = (s) => ({ content: [{ type: 'text', text: s }] });
const fail = (s) => ({ content: [{ type: 'text', text: s }], isError: true });

function line(b) {
  if (b.type === 'folder') return `[${b.id}] 📁 ${b.path ? b.path + ' / ' : ''}${b.name} (${b.childCount} items)`;
  return `[${b.id}] ${b.name} — ${b.url}${b.path ? `  (in ${b.path})` : ''}`;
}

/** Shared write pipeline: safety checks, backup, mutation, save. */
function withWrite(profileRef, { dryRun, force }, mutate) {
  const profile = resolveProfile(profileRef);
  const data = cr.load(profile.file);
  const before = cr.totals(data);
  const report = mutate(data, profile);
  const after = cr.totals(data);
  const summary = `Before: ${before.urls} bookmarks / ${before.folders} folders. After: ${after.urls} bookmarks / ${after.folders} folders.`;
  if (dryRun) {
    return text(`DRY RUN — nothing was changed in ${profile.id}.\n${summary}\n\n${report}\n\nCall again with dry_run=false to apply.`);
  }
  if (!force && isBrowserRunning(profile.browser)) {
    return fail(
      `${profile.browserLabel} is open. Ask the user to close it completely (including background windows/tray icon) and try again. ` +
        'If the browser stays open it rewrites the bookmarks file when it closes and the changes are lost.'
    );
  }
  const backupFile = cr.backup(profile);
  cr.save(profile.file, data);
  return text(
    `Done in ${profile.id}.\n${summary}\nBackup saved at: ${backupFile} (use restore_backup to undo).\n\n${report}\n\n` +
      'Note: if bookmark sync is turned on in the browser account, sync can bring back deleted items. ' +
      'For a clean result with sync on, use the export → clean → import-in-browser flow described in the skill.'
  );
}

function wrap(fn) {
  return async (args) => {
    try {
      return await fn(args);
    } catch (e) {
      return fail(`Error: ${e.message}`);
    }
  };
}

// ---------------------------------------------------------------- read tools

server.registerTool(
  'list_profiles',
  {
    title: 'List browser profiles',
    description: 'Finds every Chromium-based browser profile (Chrome, Edge, Brave, Vivaldi, Opera, Chromium) on this computer that has bookmarks, with counts and whether the browser is open.',
    inputSchema: {},
  },
  wrap(async () => {
    const profiles = discoverProfiles();
    if (!profiles.length) {
      return text('No Chromium-based browser profile with bookmarks was found. Firefox and Safari are not edited directly: export their bookmarks to HTML and use import_html / the web tool instead.');
    }
    const running = {};
    const lines = profiles.map((p) => {
      running[p.browser] ??= isBrowserRunning(p.browser);
      let counts = '';
      try {
        const t = cr.totals(cr.load(p.file));
        counts = `${t.urls} bookmarks, ${t.folders} folders`;
      } catch (e) {
        counts = `unreadable: ${e.message}`;
      }
      return `- ${p.id} — ${p.browserLabel}, profile "${p.profileName}" — ${counts}${running[p.browser] ? ' — BROWSER OPEN' : ''}\n  file: ${p.file}`;
    });
    return text(lines.join('\n'));
  })
);

server.registerTool(
  'get_bookmarks',
  {
    title: 'Get bookmarks',
    description: 'Lists bookmarks and folders of a profile with their ids and folder path. Use folder_id to look inside one folder, and folders_only for a quick overview of the structure.',
    inputSchema: {
      profile: profileArg,
      folder_id: z.string().optional().describe('Only list items inside this folder (recursively).'),
      folders_only: z.boolean().default(false),
      offset: z.number().int().min(0).default(0),
      limit: z.number().int().min(1).max(2000).default(300),
    },
  },
  wrap(async ({ profile, folder_id, folders_only, offset, limit }) => {
    const p = resolveProfile(profile);
    const data = cr.load(p.file);
    let items = cr.flatten(data);
    if (folder_id) {
      const hit = cr.findById(data, folder_id);
      if (!hit || hit.node.type !== 'folder') return fail(`Folder ${folder_id} not found.`);
      const ids = new Set();
      const collect = (n) => (n.children || []).forEach((c) => (ids.add(c.id), c.type === 'folder' && collect(c)));
      collect(hit.node);
      items = items.filter((i) => ids.has(i.id));
    }
    if (folders_only) items = items.filter((i) => i.type === 'folder');
    const t = cr.totals(data);
    const page = items.slice(offset, offset + limit);
    const more = offset + limit < items.length ? `\n… ${items.length - offset - limit} more. Call again with offset=${offset + limit}.` : '';
    return text(`${p.id}: ${t.urls} bookmarks, ${t.folders} folders in total. Showing ${page.length} of ${items.length}.\n\n${page.map(line).join('\n')}${more}`);
  })
);

server.registerTool(
  'search_bookmarks',
  {
    title: 'Search bookmarks',
    description: 'Searches bookmark names, URLs and folder names (case-insensitive).',
    inputSchema: {
      profile: profileArg,
      query: z.string().min(1),
      limit: z.number().int().min(1).max(1000).default(200),
    },
  },
  wrap(async ({ profile, query, limit }) => {
    const p = resolveProfile(profile);
    const q = query.toLowerCase();
    const hits = cr.flatten(cr.load(p.file)).filter((b) => `${b.name} ${b.url || ''} ${b.path}`.toLowerCase().includes(q));
    if (!hits.length) return text(`No results for "${query}".`);
    return text(`${hits.length} result(s) for "${query}":\n\n${hits.slice(0, limit).map(line).join('\n')}`);
  })
);

server.registerTool(
  'find_duplicates',
  {
    title: 'Find duplicate bookmarks',
    description: 'Groups bookmarks that point to the same page (ignores http/https, www, trailing slash, #fragment and utm_* tracking parameters).',
    inputSchema: { profile: profileArg },
  },
  wrap(async ({ profile }) => {
    const p = resolveProfile(profile);
    const groups = new Map();
    for (const b of cr.flatten(cr.load(p.file))) {
      if (b.type !== 'url') continue;
      const k = cr.normalizeUrl(b.url);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(b);
    }
    const dups = [...groups.values()].filter((g) => g.length > 1);
    if (!dups.length) return text('No duplicates found.');
    const extra = dups.reduce((s, g) => s + g.length - 1, 0);
    const body = dups.map((g) => g.map(line).join('\n')).join('\n\n');
    return text(`${dups.length} duplicated page(s), ${extra} extra copies that could be removed (remove_duplicates does it automatically):\n\n${body}`);
  })
);

server.registerTool(
  'stats',
  {
    title: 'Bookmark statistics',
    description: 'Overview of a profile: totals, top domains, empty folders, very old bookmarks. Good first step before proposing a cleanup.',
    inputSchema: { profile: profileArg, top: z.number().int().min(1).max(100).default(25) },
  },
  wrap(async ({ profile, top }) => {
    const p = resolveProfile(profile);
    const data = cr.load(p.file);
    const items = cr.flatten(data);
    const urls = items.filter((i) => i.type === 'url');
    const domains = new Map();
    for (const u of urls) domains.set(cr.domainOf(u.url), (domains.get(cr.domainOf(u.url)) || 0) + 1);
    const topDomains = [...domains.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
    const empty = items.filter((i) => i.type === 'folder' && i.childCount === 0);
    const dupCount = urls.length - new Set(urls.map((u) => cr.normalizeUrl(u.url))).size;
    const fiveYears = Date.now() / 1000 - 5 * 365 * 24 * 3600;
    const old = urls.filter((u) => u.dateAdded && u.dateAdded < fiveYears).length;
    const loose = urls.filter((u) => !u.path.includes(' / ')).length;
    const t = cr.totals(data);
    return text(
      [
        `${p.id}: ${t.urls} bookmarks, ${t.folders} folders.`,
        `Duplicate copies: ${dupCount}. Empty folders: ${empty.length}. Added more than 5 years ago: ${old}. Loose (not inside any subfolder): ${loose}.`,
        '',
        'Top domains:',
        ...topDomains.map(([d, n]) => `  ${n.toString().padStart(4)}  ${d || '(no domain)'}`),
        '',
        'Top-level folders:',
        ...cr.ROOT_KEYS.flatMap((k) => (data.roots[k].children || []).filter((c) => c.type === 'folder').map((c) => `  [${c.id}] ${data.roots[k].name} / ${c.name} (${cr.countNode(c).urls} bookmarks)`)),
      ].join('\n')
    );
  })
);

server.registerTool(
  'check_links',
  {
    title: 'Check for broken links',
    description: 'Visits bookmarks over the network and reports the ones that look dead (404/410, DNS failure, connection refused). Sites that block bots (401/403/429) are reported separately as "uncertain", never as dead.',
    inputSchema: {
      profile: profileArg,
      folder_id: z.string().optional().describe('Only check this folder (recursively).'),
      ids: z.array(z.string()).optional().describe('Only check these bookmark ids.'),
      max: z.number().int().min(1).max(5000).default(500),
      timeout_ms: z.number().int().min(1000).max(60000).default(10000),
      concurrency: z.number().int().min(1).max(32).default(8),
    },
  },
  wrap(async ({ profile, folder_id, ids, max, timeout_ms, concurrency }) => {
    const p = resolveProfile(profile);
    const data = cr.load(p.file);
    let urls = cr.flatten(data).filter((b) => b.type === 'url' && /^https?:/i.test(b.url));
    if (folder_id) {
      const hit = cr.findById(data, folder_id);
      if (!hit) return fail(`Folder ${folder_id} not found.`);
      const set = new Set();
      const collect = (n) => (n.children || []).forEach((c) => (set.add(c.id), c.type === 'folder' && collect(c)));
      collect(hit.node);
      urls = urls.filter((u) => set.has(u.id));
    }
    if (ids?.length) urls = urls.filter((u) => ids.includes(u.id));
    urls = urls.slice(0, max);

    const dead = [];
    const uncertain = [];
    let ok = 0;
    const check = async (b) => {
      const attempt = async (method) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout_ms);
        try {
          return await fetch(b.url, { method, redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 (bookmark-organizer link checker)' } });
        } finally {
          clearTimeout(timer);
        }
      };
      try {
        let res = await attempt('HEAD');
        if (res.status === 405 || res.status === 501 || res.status >= 400) res = await attempt('GET');
        if (res.status === 404 || res.status === 410) dead.push(`${line(b)}  → HTTP ${res.status}`);
        else if (res.status >= 400) uncertain.push(`${line(b)}  → HTTP ${res.status}`);
        else ok++;
      } catch (e) {
        const code = e.cause?.code || e.name;
        if (['ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN', 'ERR_TLS_CERT_ALTNAME_INVALID', 'CERT_HAS_EXPIRED'].includes(code)) dead.push(`${line(b)}  → ${code}`);
        else uncertain.push(`${line(b)}  → ${code === 'AbortError' ? 'timeout' : code}`);
      }
    };
    const queue = [...urls];
    await Promise.all(Array.from({ length: concurrency }, async () => { while (queue.length) await check(queue.shift()); }));
    return text(
      `Checked ${urls.length} link(s): ${ok} OK, ${dead.length} dead, ${uncertain.length} uncertain.\n\n` +
        (dead.length ? `DEAD (safe to suggest removal):\n${dead.join('\n')}\n\n` : '') +
        (uncertain.length ? `UNCERTAIN (site blocked the check, timed out or had an error — ask the user before removing):\n${uncertain.join('\n')}` : '')
    );
  })
);

server.registerTool(
  'list_backups',
  { title: 'List backups', description: 'Lists the automatic backups made before every change.', inputSchema: {} },
  wrap(async () => {
    const list = cr.listBackups();
    if (!list.length) return text(`No backups yet. Folder: ${cr.backupDir()}`);
    return text(list.map((b) => `- ${b.file}  (${b.modified}, ${Math.round(b.size / 1024)} KB)`).join('\n'));
  })
);

// --------------------------------------------------------------- write tools

server.registerTool(
  'backup',
  {
    title: 'Back up bookmarks',
    description: 'Makes a copy of the profile bookmarks file now. (Every write tool also does this automatically.)',
    inputSchema: { profile: profileArg },
  },
  wrap(async ({ profile }) => {
    const p = resolveProfile(profile);
    return text(`Backup of ${p.id} saved at ${cr.backup(p)}`);
  })
);

server.registerTool(
  'restore_backup',
  {
    title: 'Restore a backup',
    description: 'Puts a backup (from list_backups) back in place of the current bookmarks. The current state is backed up first, so this can be undone too.',
    inputSchema: { profile: profileArg, backup_file: z.string(), force: forceArg },
  },
  wrap(async ({ profile, backup_file, force }) => {
    const p = resolveProfile(profile);
    const restored = cr.load(backup_file); // validates it
    if (!force && isBrowserRunning(p.browser)) return fail(`${p.browserLabel} is open. Ask the user to close it and try again.`);
    const safety = cr.backup(p);
    cr.save(p.file, restored);
    const t = cr.totals(restored);
    return text(`Restored ${backup_file} into ${p.id} (${t.urls} bookmarks, ${t.folders} folders). Previous state saved at ${safety}.`);
  })
);

server.registerTool(
  'delete_bookmarks',
  {
    title: 'Delete bookmarks or folders',
    description: 'Deletes bookmarks and/or folders by id. Deleting a folder deletes everything inside it. Dry run by default.',
    inputSchema: { profile: profileArg, ids: z.array(z.string()).min(1), dry_run: dryRunArg, force: forceArg },
  },
  wrap(async ({ profile, ids, dry_run, force }) =>
    withWrite(profile, { dryRun: dry_run, force }, (data) => {
      const out = [];
      for (const id of ids) {
        const hit = cr.findById(data, id);
        if (!hit) { out.push(`- [${id}] not found, skipped`); continue; }
        if (cr.isRoot(data, hit.node)) { out.push(`- [${id}] is a root folder and cannot be deleted, skipped`); continue; }
        const c = cr.countNode(hit.node);
        cr.removeNode(data, id);
        out.push(hit.node.type === 'url' ? `- deleted [${id}] ${hit.node.name} — ${hit.node.url}` : `- deleted folder [${id}] ${hit.node.name} with ${c.urls} bookmarks and ${c.folders} subfolders`);
      }
      return out.join('\n');
    })
  )
);

server.registerTool(
  'remove_duplicates',
  {
    title: 'Remove duplicate bookmarks',
    description: 'Keeps one copy of each page and deletes the others. Dry run by default.',
    inputSchema: {
      profile: profileArg,
      keep: z.enum(['oldest', 'newest', 'first']).default('oldest').describe('Which copy to keep. "first" = the one that appears first walking from the bookmarks bar.'),
      dry_run: dryRunArg,
      force: forceArg,
    },
  },
  wrap(async ({ profile, keep, dry_run, force }) =>
    withWrite(profile, { dryRun: dry_run, force }, (data) => {
      const groups = new Map();
      for (const b of cr.flatten(data)) {
        if (b.type !== 'url') continue;
        const k = cr.normalizeUrl(b.url);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(b);
      }
      const out = [];
      for (const g of groups.values()) {
        if (g.length < 2) continue;
        let keeper = g[0];
        if (keep === 'oldest') keeper = g.reduce((a, b) => (b.dateAdded && b.dateAdded < a.dateAdded ? b : a));
        if (keep === 'newest') keeper = g.reduce((a, b) => (b.dateAdded > a.dateAdded ? b : a));
        for (const b of g) {
          if (b === keeper) continue;
          cr.removeNode(data, b.id);
          out.push(`- removed [${b.id}] ${b.name} (in ${b.path}); kept [${keeper.id}] in ${keeper.path}`);
        }
      }
      return out.length ? `${out.length} duplicate(s):\n${out.join('\n')}` : 'No duplicates found.';
    })
  )
);

server.registerTool(
  'create_folder',
  {
    title: 'Create folders',
    description: 'Creates a folder path such as "Bookmarks bar/Work/Clients" (missing levels are created). Paths may start with "Bookmarks bar", "Other bookmarks" or "Mobile bookmarks"; otherwise the bookmarks bar is used.',
    inputSchema: { profile: profileArg, path: z.string(), dry_run: dryRunArg, force: forceArg },
  },
  wrap(async ({ profile, path: folderPath, dry_run, force }) =>
    withWrite(profile, { dryRun: dry_run, force }, (data) => {
      const newId = cr.makeIdFactory(data);
      const f = cr.resolveFolderPath(data, folderPath, { create: true, newId });
      return `Folder ready: [${f.id}] ${folderPath}`;
    })
  )
);

server.registerTool(
  'add_bookmark',
  {
    title: 'Add a bookmark',
    description: 'Adds a bookmark to a folder (by id or path, created if missing).',
    inputSchema: {
      profile: profileArg,
      url: z.string().url(),
      name: z.string().optional(),
      folder_id: z.string().optional(),
      folder_path: z.string().optional().describe('Used when folder_id is not given. Defaults to "Bookmarks bar".'),
      dry_run: dryRunArg,
      force: forceArg,
    },
  },
  wrap(async ({ profile, url, name, folder_id, folder_path, dry_run, force }) =>
    withWrite(profile, { dryRun: dry_run, force }, (data) => {
      const newId = cr.makeIdFactory(data);
      const folder = folder_id ? cr.findById(data, folder_id)?.node : cr.resolveFolderPath(data, folder_path || 'Bookmarks bar', { create: true, newId });
      if (!folder || folder.type !== 'folder') throw new Error(`Folder ${folder_id} not found.`);
      const node = cr.makeUrl(newId, name, url);
      folder.children.push(node);
      return `Added [${node.id}] ${node.name} — ${url} to "${folder.name}".`;
    })
  )
);

server.registerTool(
  'move_bookmarks',
  {
    title: 'Move bookmarks or folders',
    description:
      'Moves items into a folder. Give target_folder_id, or target_path (e.g. "Bookmarks bar/Study/Python") which is created when missing. ' +
      'For a big reorganization, call this once per destination folder with all the ids that go there.',
    inputSchema: {
      profile: profileArg,
      ids: z.array(z.string()).min(1),
      target_folder_id: z.string().optional(),
      target_path: z.string().optional(),
      dry_run: dryRunArg,
      force: forceArg,
    },
  },
  wrap(async ({ profile, ids, target_folder_id, target_path, dry_run, force }) =>
    withWrite(profile, { dryRun: dry_run, force }, (data) => {
      if (!target_folder_id && !target_path) throw new Error('Give target_folder_id or target_path.');
      const newId = cr.makeIdFactory(data);
      const target = target_folder_id ? cr.findById(data, target_folder_id)?.node : cr.resolveFolderPath(data, target_path, { create: true, newId });
      if (!target || target.type !== 'folder') throw new Error('Target folder not found.');
      const out = [];
      for (const id of ids) {
        const hit = cr.findById(data, id);
        if (!hit || !hit.parent) { out.push(`- [${id}] not found or is a root folder, skipped`); continue; }
        // Do not move a folder into itself or its own subfolder.
        let inside = false;
        const stack = [hit.node];
        while (stack.length) {
          const n = stack.pop();
          if (n === target) inside = true;
          if (n.children) stack.push(...n.children);
        }
        if (inside) { out.push(`- [${id}] cannot be moved into itself, skipped`); continue; }
        cr.removeNode(data, id);
        target.children.push(hit.node);
        out.push(`- moved [${id}] ${hit.node.name}`);
      }
      target.date_modified = cr.chromeNow();
      return `Into "${target_path || target.name}" [${target.id}]:\n${out.join('\n')}`;
    })
  )
);

server.registerTool(
  'rename',
  {
    title: 'Rename a bookmark or folder',
    description: 'Changes the name (and optionally the URL) of a bookmark, or the name of a folder.',
    inputSchema: { profile: profileArg, id: z.string(), name: z.string().min(1), url: z.string().url().optional(), dry_run: dryRunArg, force: forceArg },
  },
  wrap(async ({ profile, id, name, url, dry_run, force }) =>
    withWrite(profile, { dryRun: dry_run, force }, (data) => {
      const hit = cr.findById(data, id);
      if (!hit) throw new Error(`Item ${id} not found.`);
      const old = hit.node.name;
      hit.node.name = name;
      if (url && hit.node.type === 'url') hit.node.url = url;
      return `[${id}] "${old}" → "${name}"${url ? ` (${url})` : ''}`;
    })
  )
);

server.registerTool(
  'sort_folder',
  {
    title: 'Sort a folder',
    description: 'Sorts the contents of a folder alphabetically, folders first. Use recursive to sort every subfolder too. Without folder_id, sorts everything except the bookmarks bar top level (whose order users usually choose by hand).',
    inputSchema: {
      profile: profileArg,
      folder_id: z.string().optional(),
      by: z.enum(['name', 'url', 'date_added']).default('name'),
      recursive: z.boolean().default(true),
      dry_run: dryRunArg,
      force: forceArg,
    },
  },
  wrap(async ({ profile, folder_id, by, recursive, dry_run, force }) =>
    withWrite(profile, { dryRun: dry_run, force }, (data) => {
      const coll = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
      const key = (n) => (by === 'url' ? n.url || n.name : by === 'date_added' ? n.date_added : n.name);
      let sorted = 0;
      const sortNode = (node, skipThisLevel = false) => {
        if (!skipThisLevel) {
          node.children.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return by === 'date_added' ? Number(key(a)) - Number(key(b)) : coll.compare(String(key(a)), String(key(b)));
          });
          sorted++;
        }
        if (recursive) node.children.filter((c) => c.type === 'folder').forEach((c) => sortNode(c));
      };
      if (folder_id) {
        const hit = cr.findById(data, folder_id);
        if (!hit || hit.node.type !== 'folder') throw new Error(`Folder ${folder_id} not found.`);
        sortNode(hit.node);
      } else {
        sortNode(data.roots.bookmark_bar, true);
        sortNode(data.roots.other);
        sortNode(data.roots.synced);
      }
      return `Sorted ${sorted} folder(s) by ${by}.`;
    })
  )
);

server.registerTool(
  'remove_empty_folders',
  {
    title: 'Remove empty folders',
    description: 'Deletes folders that contain no bookmarks (also folders that only contain empty folders). Dry run by default.',
    inputSchema: { profile: profileArg, dry_run: dryRunArg, force: forceArg },
  },
  wrap(async ({ profile, dry_run, force }) =>
    withWrite(profile, { dryRun: dry_run, force }, (data) => {
      const out = [];
      const prune = (node, trail) => {
        node.children = node.children.filter((c) => {
          if (c.type !== 'folder') return true;
          prune(c, [...trail, c.name]);
          if (c.children.length === 0) {
            out.push(`- removed empty folder [${c.id}] ${[...trail, c.name].join(' / ')}`);
            return false;
          }
          return true;
        });
      };
      for (const k of cr.ROOT_KEYS) prune(data.roots[k], [data.roots[k].name]);
      return out.length ? out.join('\n') : 'No empty folders.';
    })
  )
);

server.registerTool(
  'delete_all_bookmarks',
  {
    title: 'Delete ALL bookmarks',
    description: 'Empties the bookmarks bar, Other bookmarks and Mobile bookmarks of a profile. A backup is made first. Only use after the user explicitly asked to wipe everything and an export exists.',
    inputSchema: { profile: profileArg, dry_run: dryRunArg, force: forceArg },
  },
  wrap(async ({ profile, dry_run, force }) =>
    withWrite(profile, { dryRun: dry_run, force }, (data) => {
      for (const k of cr.ROOT_KEYS) {
        data.roots[k].children = [];
        data.roots[k].date_modified = cr.chromeNow();
      }
      return 'All bookmarks and folders removed.';
    })
  )
);

// ----------------------------------------------------------- export / import

function toNetscape(node) {
  if (node.type === 'url') return { type: 'url', name: node.name, url: node.url, addDate: cr.chromeToUnix(node.date_added) || undefined };
  return { type: 'folder', name: node.name, addDate: cr.chromeToUnix(node.date_added) || undefined, children: (node.children || []).map(toNetscape) };
}

function defaultExportPath(profile) {
  const stamp = new Date().toISOString().slice(0, 10);
  const dir = fs.existsSync(path.join(os.homedir(), 'Desktop')) ? path.join(os.homedir(), 'Desktop') : os.homedir();
  return path.join(dir, `bookmarks-${profile.browser}-${profile.profileDir.replace(/\s+/g, '')}-${stamp}.html`);
}

server.registerTool(
  'export_html',
  {
    title: 'Export bookmarks to HTML',
    description: 'Saves the bookmarks (all, or one folder) as a standard bookmarks .html file that any browser can import (Chrome, Edge, Firefox, Safari, Opera…). Does not change the browser.',
    inputSchema: {
      profile: profileArg,
      output_path: z.string().optional().describe('Where to save. Default: Desktop (or home) / bookmarks-<browser>-<profile>-<date>.html'),
      folder_id: z.string().optional().describe('Only export this folder.'),
    },
  },
  wrap(async ({ profile, output_path, folder_id }) => {
    const p = resolveProfile(profile);
    const data = cr.load(p.file);
    let folders;
    if (folder_id) {
      const hit = cr.findById(data, folder_id);
      if (!hit || hit.node.type !== 'folder') return fail(`Folder ${folder_id} not found.`);
      folders = [toNetscape(hit.node)];
    } else {
      const bar = toNetscape(data.roots.bookmark_bar);
      bar.toolbar = true;
      folders = [bar, toNetscape(data.roots.other)];
      if (data.roots.synced.children?.length) folders.push(toNetscape(data.roots.synced));
    }
    const out = output_path || defaultExportPath(p);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, ns.generate(folders), 'utf8');
    const c = folders.reduce((s, f) => { const r = ns.count(f); return { urls: s.urls + r.urls, folders: s.folders + r.folders }; }, { urls: 0, folders: 0 });
    return text(`Exported ${c.urls} bookmarks and ${c.folders} folders from ${p.id} to:\n${out}`);
  })
);

function fromNetscape(newId, node) {
  if (node.type === 'url') return cr.makeUrl(newId, node.name, node.url, node.addDate ? cr.unixToChrome(node.addDate) : undefined);
  const f = cr.makeFolder(newId, node.name || 'Folder', node.addDate ? cr.unixToChrome(node.addDate) : undefined);
  f.children = (node.children || []).map((c) => fromNetscape(newId, c));
  return f;
}

server.registerTool(
  'import_html',
  {
    title: 'Import bookmarks from HTML',
    description:
      'Loads a bookmarks .html file (exported from any browser or from the web tool) into a profile. ' +
      'mode "append": everything goes inside a new folder (default "Imported") in Other bookmarks. ' +
      'mode "replace": the current bookmarks are removed and the file becomes the new bookmarks (its toolbar folder goes to the bookmarks bar). Dry run by default.',
    inputSchema: {
      profile: profileArg,
      input_path: z.string(),
      mode: z.enum(['append', 'replace']).default('append'),
      folder_name: z.string().default('Imported').describe('Folder used by append mode.'),
      skip_existing: z.boolean().default(true).describe('Append mode: skip pages that are already bookmarked.'),
      dry_run: dryRunArg,
      force: forceArg,
    },
  },
  wrap(async ({ profile, input_path, mode, folder_name, skip_existing, dry_run, force }) => {
    const tree = ns.parse(fs.readFileSync(input_path, 'utf8'));
    const counts = ns.count(tree);
    if (!counts.urls) return fail(`No bookmarks found in ${input_path}. Is it a bookmarks HTML export?`);
    return withWrite(profile, { dryRun: dry_run, force }, (data) => {
      const newId = cr.makeIdFactory(data);
      if (mode === 'replace') {
        for (const k of cr.ROOT_KEYS) data.roots[k].children = [];
        // Typical exports: one toolbar folder + an "Other bookmarks" folder + loose items.
        const tops = tree.children;
        const otherNames = ['other bookmarks', 'outros favoritos', 'outros marcadores', 'otros marcadores', 'bookmarks menu', 'menu de favoritos'];
        for (const t of tops) {
          if (t.type === 'folder' && t.toolbar) data.roots.bookmark_bar.children.push(...t.children.map((c) => fromNetscape(newId, c)));
          else if (t.type === 'folder' && otherNames.includes(t.name.toLowerCase())) data.roots.other.children.push(...t.children.map((c) => fromNetscape(newId, c)));
          else if (t.type === 'folder' && /^(mobile bookmarks|favoritos do celular|marcadores do celular)$/i.test(t.name)) data.roots.synced.children.push(...t.children.map((c) => fromNetscape(newId, c)));
          else data.roots.other.children.push(fromNetscape(newId, t));
        }
        return `Replaced all bookmarks with ${counts.urls} bookmarks and ${counts.folders} folders from ${input_path}.`;
      }
      const existing = new Set(cr.flatten(data).filter((b) => b.type === 'url').map((b) => cr.normalizeUrl(b.url)));
      let skipped = 0;
      const filter = (node) => {
        if (node.type === 'url') {
          if (skip_existing && existing.has(cr.normalizeUrl(node.url))) { skipped++; return null; }
          existing.add(cr.normalizeUrl(node.url));
          return node;
        }
        return { ...node, children: node.children.map(filter).filter(Boolean) };
      };
      const filtered = filter(tree);
      const folder = cr.makeFolder(newId, folder_name);
      folder.children = filtered.children.map((c) => fromNetscape(newId, c));
      data.roots.other.children.push(folder);
      return `Imported ${counts.urls - skipped} bookmarks into "Other bookmarks / ${folder_name}" [${folder.id}]${skipped ? `; ${skipped} skipped because they already existed` : ''}.`;
    });
  })
);

server.registerTool(
  'preview_html',
  {
    title: 'Preview an HTML bookmarks file',
    description: 'Reads a bookmarks .html file and shows its folder structure and counts without importing anything.',
    inputSchema: { input_path: z.string(), max_lines: z.number().int().min(10).max(3000).default(300) },
  },
  wrap(async ({ input_path, max_lines }) => {
    const tree = ns.parse(fs.readFileSync(input_path, 'utf8'));
    const c = ns.count(tree);
    const lines = [];
    const emit = (n, d) => {
      if (lines.length >= max_lines) return;
      if (n.type === 'url') lines.push(`${'  '.repeat(d)}- ${n.name} — ${n.url}`);
      else {
        lines.push(`${'  '.repeat(d)}📁 ${n.name}${n.toolbar ? ' (bookmarks bar)' : ''} — ${ns.count(n).urls} bookmarks`);
        n.children.forEach((x) => emit(x, d + 1));
      }
    };
    tree.children.forEach((x) => emit(x, 0));
    return text(`${input_path}: ${c.urls} bookmarks, ${c.folders} folders.\n\n${lines.join('\n')}${lines.length >= max_lines ? '\n…' : ''}`);
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
