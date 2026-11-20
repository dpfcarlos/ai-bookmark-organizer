// Reads, edits and writes the Chromium "Bookmarks" JSON file.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROOT_KEYS = ['bookmark_bar', 'other', 'synced'];
export const ROOT_LABELS = { bookmark_bar: 'Bookmarks bar', other: 'Other bookmarks', synced: 'Mobile bookmarks' };

export function backupDir() {
  return process.env.BOOKMARK_ORGANIZER_BACKUPS || path.join(os.homedir(), '.bookmark-organizer', 'backups');
}

// Chromium stores times as microseconds since 1601-01-01 (as a string).
const EPOCH_DIFF_MS = 11644473600000;
export function chromeNow() {
  return String((Date.now() + EPOCH_DIFF_MS) * 1000);
}
export function chromeToUnix(t) {
  const n = Number(t);
  if (!n) return 0;
  return Math.floor(n / 1000000 - EPOCH_DIFF_MS / 1000);
}
export function unixToChrome(sec) {
  if (!sec) return chromeNow();
  return String((Number(sec) * 1000 + EPOCH_DIFF_MS) * 1000);
}

export function load(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.roots) throw new Error(`${file} does not look like a Chromium Bookmarks file.`);
  for (const k of ROOT_KEYS) {
    if (!data.roots[k]) {
      data.roots[k] = { children: [], date_added: chromeNow(), date_modified: '0', id: '0', name: ROOT_LABELS[k], type: 'folder', guid: crypto.randomUUID() };
    }
  }
  return data;
}

/** Copies the current file into the backup folder and returns the backup path. */
export function backup(profile) {
  const dir = backupDir();
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safe = `${profile.browser}-${profile.profileDir}`.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const dest = path.join(dir, `${safe}-${stamp}.json`);
  fs.copyFileSync(profile.file, dest);
  return dest;
}

export function listBackups() {
  const dir = backupDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const full = path.join(dir, f);
      return { file: full, size: fs.statSync(full).size, modified: fs.statSync(full).mtime.toISOString() };
    })
    .sort((a, b) => b.modified.localeCompare(a.modified));
}

/**
 * Writes the file safely. The "checksum" field is removed so the browser
 * accepts the edited file instead of falling back to its own copy.
 */
export function save(file, data) {
  delete data.checksum;
  const tmp = `${file}.organizer-tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 3), 'utf8');
  fs.renameSync(tmp, file);
}

/** Walks every node. callback(node, parent, pathArray, rootKey). */
export function walk(data, callback) {
  for (const key of ROOT_KEYS) {
    const root = data.roots[key];
    const visit = (node, parent, trail) => {
      callback(node, parent, trail, key);
      if (node.type === 'folder') {
        for (const child of node.children || []) visit(child, node, [...trail, node.name]);
      }
    };
    visit(root, null, []);
  }
}

export function isRoot(data, node) {
  return ROOT_KEYS.some((k) => data.roots[k] === node);
}

/** Flat list of bookmarks and folders with their full path. */
export function flatten(data) {
  const out = [];
  walk(data, (node, parent, trail, rootKey) => {
    if (!parent) return; // skip root folders themselves
    out.push({
      id: node.id,
      type: node.type,
      name: node.name,
      url: node.url,
      path: trail.join(' / '),
      parentId: parent.id,
      rootKey,
      dateAdded: chromeToUnix(node.date_added),
      childCount: node.type === 'folder' ? (node.children || []).length : undefined,
    });
  });
  return out;
}

export function findById(data, id) {
  let hit = null;
  walk(data, (node, parent) => {
    if (!hit && String(node.id) === String(id)) hit = { node, parent };
  });
  return hit;
}

export function maxId(data) {
  let max = 0;
  walk(data, (node) => {
    const n = Number(node.id);
    if (n > max) max = n;
  });
  return max;
}

export function makeIdFactory(data) {
  let next = maxId(data) + 1;
  return () => String(next++);
}

export function makeUrl(newId, name, url, dateAdded) {
  return { date_added: dateAdded || chromeNow(), guid: crypto.randomUUID(), id: newId(), name: name || url, type: 'url', url };
}

export function makeFolder(newId, name, dateAdded) {
  return { children: [], date_added: dateAdded || chromeNow(), date_modified: chromeNow(), guid: crypto.randomUUID(), id: newId(), name, type: 'folder' };
}

/** Resolves "Bookmarks bar/Dev/JS" to a folder, creating missing ones when create=true. */
export function resolveFolderPath(data, folderPath, { create = false, newId } = {}) {
  const parts = folderPath.split('/').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) throw new Error('Empty folder path.');
  const rootKey =
    ROOT_KEYS.find((k) => ROOT_LABELS[k].toLowerCase() === parts[0].toLowerCase() || data.roots[k].name.toLowerCase() === parts[0].toLowerCase() || k === parts[0].toLowerCase());
  let current;
  let rest;
  if (rootKey) {
    current = data.roots[rootKey];
    rest = parts.slice(1);
  } else {
    current = data.roots.bookmark_bar;
    rest = parts;
  }
  for (const part of rest) {
    let next = (current.children || []).find((c) => c.type === 'folder' && c.name.toLowerCase() === part.toLowerCase());
    if (!next) {
      if (!create) throw new Error(`Folder "${part}" not found in path "${folderPath}".`);
      next = makeFolder(newId, part);
      current.children.push(next);
    }
    current = next;
  }
  return current;
}

export function removeNode(data, id) {
  const hit = findById(data, id);
  if (!hit || !hit.parent) return null;
  hit.parent.children = hit.parent.children.filter((c) => c !== hit.node);
  hit.parent.date_modified = chromeNow();
  return hit.node;
}

export function countNode(node) {
  if (node.type !== 'folder') return { urls: 1, folders: 0 };
  let urls = 0;
  let folders = 0;
  for (const c of node.children || []) {
    const r = countNode(c);
    urls += r.urls;
    folders += r.folders + (c.type === 'folder' ? 1 : 0);
  }
  return { urls, folders };
}

export function totals(data) {
  let urls = 0;
  let folders = 0;
  for (const k of ROOT_KEYS) {
    const r = countNode(data.roots[k]);
    urls += r.urls;
    folders += r.folders;
  }
  return { urls, folders };
}

/** Normalizes a URL so trivially different copies are treated as duplicates. */
export function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    let host = u.hostname.toLowerCase().replace(/^www\./, '');
    let p = u.pathname.replace(/\/+$/, '');
    const params = [...u.searchParams.entries()].filter(([k]) => !/^utm_|^fbclid$|^gclid$/i.test(k)).sort(([a], [b]) => a.localeCompare(b));
    const q = params.length ? '?' + params.map(([k, v]) => `${k}=${v}`).join('&') : '';
    const proto = u.protocol === 'http:' ? 'https:' : u.protocol;
    return `${proto}//${host}${u.port ? ':' + u.port : ''}${p}${q}`;
  } catch {
    return String(url).trim().toLowerCase();
  }
}

export function domainOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}
