import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as v from '../dist-electron/electron/validate.js';

test('renderer arguments', () => {
  assert.equal(v.queryText('report 2026'), 'report 2026');
  assert.equal(v.queryText('a\u0000b'), null);
  assert.equal(v.queryText('x'.repeat(513)), null);
  assert.equal(v.queryText(42), null);
  assert.equal(v.scope('files'), 'files');
  assert.equal(v.scope('content'), null); // not in phase 1
  assert.equal(v.limit(50), 50);
  assert.equal(v.limit(0), null);
  assert.equal(v.limit(2.5), null);
  assert.equal(v.handle('12.3'), '12.3');
  assert.equal(v.handle('C:\\Windows\\notepad.exe'), null);
  assert.equal(v.windowHeight(300.4), 300);
  assert.equal(v.windowHeight(1e9), null);
});

test('search replies keep only well-formed rows', () => {
  const reply = v.searchReply({
    results: [
      { id: '1.0', kind: 'file', name: 'a.txt', path: 'C:\\a.txt', size: 3, extra: 'dropped' },
      { id: '1.1', kind: 'nonsense', name: 'x' },
      { kind: 'file', name: 'no id' },
    ],
    total: 3,
    elapsedUs: 120,
  });
  assert.deepEqual(reply, { results: [{ id: '1.0', kind: 'file', name: 'a.txt', path: 'C:\\a.txt', size: 3 }], total: 3, elapsedUs: 120 });
  assert.equal(v.searchReply({}), null);
});

test('launch plans never reach the web or run script', () => {
  assert.deepEqual(v.launchPlan({ how: 'uri', target: 'ms-settings:display', canReveal: true }), {
    how: 'uri',
    target: 'ms-settings:display',
    canReveal: false,
  });
  for (const target of ['https://example.com', 'http://x', 'file:///C:/x', 'javascript:alert(1)', 'C:\\x']) {
    assert.equal(v.launchPlan({ how: 'uri', target, canReveal: false }), null, target);
  }
  assert.deepEqual(v.launchPlan({ how: 'program', target: 'C:\\Windows\\explorer.exe', arguments: ['shell:AppsFolder\\X'] }), {
    how: 'program',
    target: 'C:\\Windows\\explorer.exe',
    arguments: ['shell:AppsFolder\\X'],
    canReveal: false,
  });
  assert.equal(v.launchPlan({ how: 'program', target: 'x', arguments: [1] }), null);
  assert.equal(v.launchPlan({ how: 'shell', target: 'x' }), null);
});
