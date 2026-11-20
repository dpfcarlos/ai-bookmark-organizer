// Builds a fake Chromium profile on disk for tests.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function makeProfile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-test-'));
  const t = '13300000000000000';
  const u = (id, name, url) => ({ date_added: t, guid: `g${id}`, id: String(id), name, type: 'url', url });
  const data = {
    checksum: 'abc',
    roots: {
      bookmark_bar: { children: [
        u(5, 'GitHub', 'https://github.com/'),
        u(6, 'GitHub again', 'http://www.github.com'),
        { children: [u(8, 'MDN', 'https://developer.mozilla.org/?utm_source=x'), u(9, 'MDN 2', 'https://developer.mozilla.org/')], date_added: t, date_modified: t, guid: 'g7', id: '7', name: 'Dev', type: 'folder' },
        { children: [], date_added: t, date_modified: t, guid: 'g10', id: '10', name: 'Empty', type: 'folder' },
      ], date_added: t, date_modified: t, guid: 'g1', id: '1', name: 'Bookmarks bar', type: 'folder' },
      other: { children: [u(11, 'News', 'https://news.example.com/')], date_added: t, date_modified: t, guid: 'g2', id: '2', name: 'Other bookmarks', type: 'folder' },
      synced: { children: [], date_added: t, date_modified: t, guid: 'g3', id: '3', name: 'Mobile bookmarks', type: 'folder' },
    },
    version: 1,
  };
  const file = path.join(dir, 'Bookmarks');
  fs.writeFileSync(file, JSON.stringify(data));
  return { dir, file };
}
