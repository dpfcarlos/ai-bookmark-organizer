// Locates Chromium-based browser profiles (Chrome, Edge, Brave, Vivaldi, Opera, Chromium)
// and their "Bookmarks" files on Windows, macOS and Linux.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

const home = os.homedir();
const platform = process.platform;

function localAppData() {
  return process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
}
function roamingAppData() {
  return process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
}

// Each browser: user-data directory per OS, plus process names used to detect if it is open.
export const BROWSERS = {
  chrome: {
    label: 'Google Chrome',
    dirs: {
      win32: () => path.join(localAppData(), 'Google', 'Chrome', 'User Data'),
      darwin: () => path.join(home, 'Library', 'Application Support', 'Google', 'Chrome'),
      linux: () => path.join(home, '.config', 'google-chrome'),
    },
    processes: { win32: ['chrome.exe'], darwin: ['Google Chrome'], linux: ['chrome', 'google-chrome'] },
  },
  edge: {
    label: 'Microsoft Edge',
    dirs: {
      win32: () => path.join(localAppData(), 'Microsoft', 'Edge', 'User Data'),
      darwin: () => path.join(home, 'Library', 'Application Support', 'Microsoft Edge'),
      linux: () => path.join(home, '.config', 'microsoft-edge'),
    },
    processes: { win32: ['msedge.exe'], darwin: ['Microsoft Edge'], linux: ['msedge', 'microsoft-edge'] },
  },
  brave: {
    label: 'Brave',
    dirs: {
      win32: () => path.join(localAppData(), 'BraveSoftware', 'Brave-Browser', 'User Data'),
      darwin: () => path.join(home, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser'),
      linux: () => path.join(home, '.config', 'BraveSoftware', 'Brave-Browser'),
    },
    processes: { win32: ['brave.exe'], darwin: ['Brave Browser'], linux: ['brave', 'brave-browser'] },
  },
  vivaldi: {
    label: 'Vivaldi',
    dirs: {
      win32: () => path.join(localAppData(), 'Vivaldi', 'User Data'),
      darwin: () => path.join(home, 'Library', 'Application Support', 'Vivaldi'),
      linux: () => path.join(home, '.config', 'vivaldi'),
    },
    processes: { win32: ['vivaldi.exe'], darwin: ['Vivaldi'], linux: ['vivaldi', 'vivaldi-bin'] },
  },
  opera: {
    label: 'Opera',
    // Opera keeps the profile directly in this folder (no "Default" subfolder).
    single: true,
    dirs: {
      win32: () => path.join(roamingAppData(), 'Opera Software', 'Opera Stable'),
      darwin: () => path.join(home, 'Library', 'Application Support', 'com.operasoftware.Opera'),
      linux: () => path.join(home, '.config', 'opera'),
    },
    processes: { win32: ['opera.exe'], darwin: ['Opera'], linux: ['opera'] },
  },
  chromium: {
    label: 'Chromium',
    dirs: {
      win32: () => path.join(localAppData(), 'Chromium', 'User Data'),
      darwin: () => path.join(home, 'Library', 'Application Support', 'Chromium'),
      linux: () => path.join(home, '.config', 'chromium'),
    },
    processes: { win32: ['chromium.exe'], darwin: ['Chromium'], linux: ['chromium', 'chromium-browser'] },
  },
};

function readProfileNames(userDataDir) {
  try {
    const localState = JSON.parse(fs.readFileSync(path.join(userDataDir, 'Local State'), 'utf8'));
    const cache = localState?.profile?.info_cache || {};
    const names = {};
    for (const [dir, info] of Object.entries(cache)) names[dir] = info?.name;
    return names;
  } catch {
    return {};
  }
}

/**
 * Returns every profile that has a Bookmarks file.
 * Each item: { id: "chrome:Default", browser, browserLabel, profileDir, profileName, file }
 */
export function discoverProfiles() {
  const found = [];
  for (const [key, b] of Object.entries(BROWSERS)) {
    const dirFn = b.dirs[platform];
    if (!dirFn) continue;
    const userDataDir = dirFn();
    if (!fs.existsSync(userDataDir)) continue;

    if (b.single) {
      const file = path.join(userDataDir, 'Bookmarks');
      if (fs.existsSync(file)) {
        found.push({ id: `${key}:Default`, browser: key, browserLabel: b.label, profileDir: 'Default', profileName: 'Default', file });
      }
      continue;
    }

    const names = readProfileNames(userDataDir);
    let entries = [];
    try {
      entries = fs.readdirSync(userDataDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name !== 'Default' && !/^Profile \d+$/.test(e.name)) continue;
      const file = path.join(userDataDir, e.name, 'Bookmarks');
      if (!fs.existsSync(file)) continue;
      found.push({
        id: `${key}:${e.name}`,
        browser: key,
        browserLabel: b.label,
        profileDir: e.name,
        profileName: names[e.name] || e.name,
        file,
      });
    }
  }
  return found;
}

/**
 * Resolves a profile reference. Accepts:
 *  - an id from discoverProfiles(), e.g. "chrome:Default" or "edge:Profile 1"
 *  - an absolute path to a Bookmarks file
 *  - nothing, when exactly one profile exists (or BOOKMARKS_FILE is set)
 */
export function resolveProfile(ref) {
  if (!ref && process.env.BOOKMARKS_FILE) ref = process.env.BOOKMARKS_FILE;
  if (ref && (path.isAbsolute(ref) || ref.includes(path.sep)) && fs.existsSync(ref)) {
    return { id: ref, browser: 'custom', browserLabel: 'Custom file', profileDir: path.dirname(ref), profileName: path.basename(path.dirname(ref)), file: ref };
  }
  const all = discoverProfiles();
  if (!ref) {
    if (all.length === 1) return all[0];
    if (all.length === 0) throw new Error('No browser profile with bookmarks was found on this computer. Pass the full path to a "Bookmarks" file instead.');
    throw new Error(`More than one profile was found. Pass one of these as "profile": ${all.map((p) => p.id).join(', ')}`);
  }
  const lower = ref.toLowerCase();
  const match =
    all.find((p) => p.id.toLowerCase() === lower) ||
    all.find((p) => `${p.browser}:${p.profileName}`.toLowerCase() === lower) ||
    (all.filter((p) => p.browser === lower).length === 1 ? all.find((p) => p.browser === lower) : undefined);
  if (!match) {
    throw new Error(`Profile "${ref}" not found. Available: ${all.map((p) => p.id).join(', ') || 'none'}`);
  }
  return match;
}

/** Best-effort check whether the browser that owns the profile is currently running. */
export function isBrowserRunning(browserKey) {
  const b = BROWSERS[browserKey];
  if (!b) return false;
  const names = b.processes[platform] || [];
  try {
    if (platform === 'win32') {
      const out = execSync('tasklist /fo csv /nh', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).toLowerCase();
      return names.some((n) => out.includes(`"${n.toLowerCase()}"`));
    }
    const out = execSync('ps -A -o comm=', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = out.split('\n').map((l) => path.basename(l.trim()));
    return names.some((n) => lines.includes(n));
  } catch {
    return false;
  }
}
