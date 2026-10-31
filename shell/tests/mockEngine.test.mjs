import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MockEngine } from '../dist-electron/electron/mockEngine.js';

test('ranks apps first in all, and scopes narrow', async () => {
  const e = new MockEngine(0);
  await e.start();
  const all = await e.search('vis', 'all', 50);
  assert.ok(all.results.length >= 2);
  assert.equal(all.results[0].kind, 'app');
  const folders = await e.search('pro', 'folders', 50);
  assert.ok(folders.results.every((r) => r.kind === 'folder'));
  const none = await e.search('zzzz', 'all', 50);
  assert.equal(none.results.length, 0);
});

test('handles go stale after a few searches', async () => {
  const e = new MockEngine(0);
  const first = await e.search('resume', 'all', 5);
  const id = first.results[0].id;
  assert.equal((await e.resolve(id)).canReveal, true);
  for (let i = 0; i < 3; i++) await e.search('resume', 'all', 5);
  await assert.rejects(e.resolve(id), /stale/);
});
