import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LineFramer } from '../dist-electron/electron/lineFramer.js';

test('splits lines across chunks and drops CR and blanks', () => {
  const lines = [];
  const f = new LineFramer(1024, (l) => lines.push(l), () => assert.fail('overflow'));
  f.push(Buffer.from('{"a":1}\r\n{"b"'));
  f.push(Buffer.from(':2}\n\n{"c":3}'));
  f.push(Buffer.from('\n'));
  assert.deepEqual(lines, ['{"a":1}', '{"b":2}', '{"c":3}']);
});

test('keeps multi-byte characters split between chunks intact', () => {
  const lines = [];
  const f = new LineFramer(1024, (l) => lines.push(l), () => {});
  const bytes = Buffer.from('年度报告\n');
  f.push(bytes.subarray(0, 4));
  f.push(bytes.subarray(4));
  assert.deepEqual(lines, ['年度报告']);
});

test('a line over the cap is an overflow, not buffered', () => {
  let overflows = 0;
  const lines = [];
  const f = new LineFramer(8, (l) => lines.push(l), () => overflows++);
  f.push(Buffer.from('0123456789'));
  assert.equal(overflows, 1);
  f.push(Buffer.from('ok\n'));
  assert.deepEqual(lines, ['ok']);
});
