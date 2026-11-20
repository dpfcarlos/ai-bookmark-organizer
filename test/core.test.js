import test from 'node:test';
import assert from 'node:assert/strict';
import * as ns from '../src/netscape.js';
import * as cr from '../src/chromium.js';
import { makeProfile } from './fixture.js';

test('netscape round trip', () => {
  const html = ns.generate([{ type: 'folder', name: 'Bar', toolbar: true, children: [
    { type: 'url', name: 'A & B', url: 'https://a.com/?x=1&y=2' },
    { type: 'folder', name: 'Sub', children: [{ type: 'url', name: 'C', url: 'https://c.com' }] },
  ] }]);
  const tree = ns.parse(html);
  assert.equal(tree.children[0].toolbar, true);
  assert.equal(tree.children[0].children[0].name, 'A & B');
  assert.equal(tree.children[0].children[0].url, 'https://a.com/?x=1&y=2');
  assert.deepEqual(ns.count(tree), { urls: 2, folders: 2 });
});

test('normalizeUrl treats trivial variants as equal', () => {
  assert.equal(cr.normalizeUrl('http://www.github.com'), cr.normalizeUrl('https://github.com/'));
  assert.equal(cr.normalizeUrl('https://x.com/a?utm_source=1#top'), cr.normalizeUrl('https://x.com/a'));
  assert.notEqual(cr.normalizeUrl('https://x.com/a?id=1'), cr.normalizeUrl('https://x.com/a?id=2'));
});

test('chromium load, flatten and folder paths', () => {
  const { file } = makeProfile();
  const data = cr.load(file);
  assert.deepEqual(cr.totals(data), { urls: 5, folders: 2 });
  const newId = cr.makeIdFactory(data);
  const f = cr.resolveFolderPath(data, 'Other bookmarks/Work/Clients', { create: true, newId });
  assert.equal(f.name, 'Clients');
  assert.equal(f.id, '13'); // "Work" got 12
  cr.save(file, data);
  assert.equal(cr.load(file).checksum, undefined);
});
