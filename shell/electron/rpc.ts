// JSON-RPC 2.0 client on a duplex stream, one message per line: requests
// with timeouts, notifications from the server. Knows nothing of pipes or
// processes, so it is tested over any socket.

import { EventEmitter } from 'node:events';
import type { Duplex } from 'node:stream';
import { LineFramer } from './lineFramer';

export const MAX_REPLY_BYTES = 8 * 1024 * 1024; // 200 rows are far below this
export const DEFAULT_TIMEOUT_MS = 12_000; // the bridge gives up on a search after 10 s

export class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

// Codes the bridge uses (upstream src/mcp/JsonRpc.h).
export const CANCELLED = -32800;
export const UNAVAILABLE = -32000;

interface Pending {
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer: NodeJS.Timeout;
}

export class RpcConnection extends EventEmitter {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private closed = false;
  private readonly framer: LineFramer;

  constructor(private readonly stream: Duplex) {
    super();
    this.framer = new LineFramer(
      MAX_REPLY_BYTES,
      (line) => this.receive(line),
      () => this.fail(new Error('a reply over the size limit')),
    );
    stream.on('data', (data: Buffer) => this.framer.push(data));
    stream.on('error', (error) => this.fail(error));
    stream.on('close', () => this.fail(new Error('the bridge closed the connection')));
  }

  request<T>(method: string, params: Record<string, unknown> = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    if (this.closed) return Promise.reject(new Error('not connected'));
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new RpcError(UNAVAILABLE, `${method} timed out`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      this.stream.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  close(): void {
    this.fail(new Error('closed'));
    this.stream.destroy();
  }

  get isClosed(): boolean {
    return this.closed;
  }

  private receive(line: string): void {
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      return; // not ours to guess at
    }
    if (typeof message !== 'object' || message === null || Array.isArray(message)) return;
    const m = message as Record<string, unknown>;
    if (m.jsonrpc !== '2.0') return;
    if (typeof m.method === 'string' && m.id === undefined) {
      this.emit('notification', m.method, (m.params ?? {}) as Record<string, unknown>);
      return;
    }
    if (typeof m.id !== 'number') return;
    const call = this.pending.get(m.id);
    if (!call) return;
    this.pending.delete(m.id);
    clearTimeout(call.timer);
    if (m.error && typeof m.error === 'object') {
      const e = m.error as { code?: unknown; message?: unknown };
      call.reject(new RpcError(typeof e.code === 'number' ? e.code : 0, typeof e.message === 'string' ? e.message : 'error'));
    } else {
      call.resolve(m.result);
    }
  }

  private fail(error: Error): void {
    if (this.closed) return;
    this.closed = true;
    for (const call of this.pending.values()) {
      clearTimeout(call.timer);
      call.reject(error);
    }
    this.pending.clear();
    this.emit('closed', error);
  }
}
