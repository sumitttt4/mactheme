import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PassThrough, Duplex } from 'node:stream';
import { RpcConnection, RpcError } from '../dist-electron/electron/rpc.js';

// A duplex whose writes go to `toServer` and whose reads come from `fromServer`.
function pair() {
  const toServer = new PassThrough();
  const fromServer = new PassThrough();
  const stream = Duplex.from({ readable: fromServer, writable: toServer });
  return { stream, toServer, fromServer };
}

const nextLine = (s) => new Promise((resolve) => s.once('data', (d) => resolve(JSON.parse(d.toString()))));

test('answers requests by id, out of order', async () => {
  const { stream, toServer, fromServer } = pair();
  const rpc = new RpcConnection(stream);
  const sent = [];
  toServer.on('data', (d) => sent.push(JSON.parse(d.toString())));
  const a = rpc.request('a');
  const b = rpc.request('b', { x: 1 });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(sent.map((m) => m.method), ['a', 'b']);
  assert.deepEqual(sent[1].params, { x: 1 });
  fromServer.write(JSON.stringify({ jsonrpc: '2.0', id: sent[1].id, result: 'B' }) + '\n');
  fromServer.write(JSON.stringify({ jsonrpc: '2.0', id: sent[0].id, error: { code: -32602, message: 'nope' } }) + '\n');
  assert.equal(await b, 'B');
  await assert.rejects(a, (e) => e instanceof RpcError && e.code === -32602 && e.message === 'nope');
  rpc.close();
});

test('emits notifications and ignores junk', async () => {
  const { stream, fromServer } = pair();
  const rpc = new RpcConnection(stream);
  const got = new Promise((resolve) => rpc.once('notification', (method, params) => resolve({ method, params })));
  fromServer.write('not json\n[1,2]\n{"jsonrpc":"1.0","method":"x"}\n');
  fromServer.write('{"jsonrpc":"2.0","method":"index.state","params":{"state":"ready","items":3}}\n');
  assert.deepEqual(await got, { method: 'index.state', params: { state: 'ready', items: 3 } });
  rpc.close();
});

test('times out, and fails everything pending when the stream closes', async () => {
  const { stream, toServer } = pair();
  const rpc = new RpcConnection(stream);
  await assert.rejects(rpc.request('slow', {}, 20), /timed out/);
  const pending = rpc.request('never');
  await nextLine(toServer);
  stream.destroy();
  await assert.rejects(pending);
  await assert.rejects(rpc.request('after'), /not connected/);
});
