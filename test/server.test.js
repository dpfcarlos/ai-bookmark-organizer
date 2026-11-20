// End-to-end: talks to the MCP server over stdio, like an AI client would.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { makeProfile } from './fixture.js';

test('MCP server end to end', async () => {
  const { dir, file } = makeProfile();
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve('src/server.js')],
    env: { ...process.env, BOOKMARKS_FILE: file, BOOKMARK_ORGANIZER_BACKUPS: path.join(dir, 'backups') },
  });
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(transport);
  const call = async (name, args = {}) => {
    const r = await client.callTool({ name, arguments: args });
    return { text: r.content[0].text, isError: r.isError };
  };
  try {
    const tools = (await client.listTools()).tools.map((t) => t.name);
    for (const t of ['list_profiles', 'get_bookmarks', 'find_duplicates', 'remove_duplicates', 'export_html', 'import_html', 'delete_all_bookmarks', 'restore_backup']) assert.ok(tools.includes(t), t);

    assert.match((await call('find_duplicates')).text, /2 duplicated page/);

    // dry run changes nothing
    const dry = await call('remove_duplicates');
    assert.match(dry.text, /DRY RUN/);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).checksum, 'abc');

    const real = await call('remove_duplicates', { dry_run: false, force: true });
    assert.match(real.text, /After: 3 bookmarks/);
    assert.match(real.text, /Backup saved at/);

    await call('remove_empty_folders', { dry_run: false, force: true });
    await call('move_bookmarks', { ids: ['11'], target_path: 'Bookmarks bar/Reading', dry_run: false, force: true });
    assert.match((await call('search_bookmarks', { query: 'news' })).text, /Reading/);

    const out = path.join(dir, 'export.html');
    assert.match((await call('export_html', { output_path: out })).text, /Exported 3 bookmarks/);

    await call('delete_all_bookmarks', { dry_run: false, force: true });
    assert.match((await call('get_bookmarks')).text, /0 bookmarks/);

    const imp = await call('import_html', { input_path: out, mode: 'replace', dry_run: false, force: true });
    assert.match(imp.text, /After: 3 bookmarks/);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(data.roots.bookmark_bar.children.some((c) => c.name === 'Reading'), 'toolbar restored to bookmarks bar');

    const backups = (await call('list_backups')).text.split('\n').filter((l) => l.startsWith('- '));
    assert.ok(backups.length >= 4);
    const oldest = backups.at(-1).slice(2).split('  (')[0];
    await call('restore_backup', { backup_file: oldest, force: true });
    assert.match((await call('get_bookmarks')).text, /5 bookmarks/);
  } finally {
    await client.close();
  }
});
