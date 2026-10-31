// The real engine: wsbridge.exe, started hidden by this process, spoken to
// over a named pipe whose name is made fresh each start (nobody can have
// made it first; the bridge also refuses to serve a name already taken).
// The bridge ends when its stdin closes, so it never outlives the shell.

import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { createWriteStream, existsSync, mkdirSync, type WriteStream } from 'node:fs';
import { connect } from 'node:net';
import { dirname } from 'node:path';
import { identity } from '../shared/identity';
import type { EngineState, IndexStatus, LaunchPlan, Scope, SearchReply } from '../shared/protocol';
import type { Engine } from './engine';
import { RpcConnection } from './rpc';
import * as validate from './validate';

const PROTOCOL = 1;
const READY_TIMEOUT_MS = 20_000;
const RESTARTS_PER_MINUTE = 5;

export interface BridgeOptions {
  exe: string;
  logFile: string;
  extraArgs?: string[];
}

export class BridgeEngine extends EventEmitter implements Engine {
  private child: ChildProcess | null = null;
  private rpc: RpcConnection | null = null;
  private current: EngineState = { up: false, reason: 'starting' };
  private stopping = false;
  private restarts: number[] = [];
  private log: WriteStream | null = null;

  constructor(private readonly options: BridgeOptions) {
    super();
  }

  state(): EngineState {
    return this.current;
  }

  async start(): Promise<void> {
    this.stopping = false;
    if (!existsSync(this.options.exe)) {
      this.set({ up: false, reason: `bridge not found: ${this.options.exe}` });
      return;
    }
    mkdirSync(dirname(this.options.logFile), { recursive: true });
    this.log ??= createWriteStream(this.options.logFile, { flags: 'a' });
    try {
      await this.launch();
    } catch (error) {
      this.rpc?.close();
      this.rpc = null;
      this.child?.kill(); // half started: not left running
      this.child = null;
      this.set({ up: false, reason: (error as Error).message });
      this.scheduleRestart();
    }
  }

  stop(): void {
    this.stopping = true;
    this.rpc?.close();
    this.rpc = null;
    this.child?.stdin?.end(); // the bridge saves its index and quits
    this.child = null;
    this.log?.end();
    this.log = null;
  }

  async search(text: string, scope: Scope, limit: number): Promise<SearchReply> {
    const reply = validate.searchReply(await this.connection().request('search.names', { text, scope, limit }));
    if (!reply) throw new Error('the bridge sent an unexpected reply');
    return reply;
  }

  async resolve(id: string): Promise<LaunchPlan> {
    const plan = validate.launchPlan(await this.connection().request('item.resolve', { id }));
    if (!plan) throw new Error('the bridge sent an unusable launch plan');
    return plan;
  }

  private connection(): RpcConnection {
    if (!this.rpc || this.rpc.isClosed) throw new Error('the engine is not running');
    return this.rpc;
  }

  private set(state: EngineState): void {
    this.current = state;
    this.emit('state', state);
  }

  private launch(): Promise<void> {
    const pipe = `${identity.bridgePipePrefix}.${randomBytes(16).toString('hex')}`;
    const child = spawn(this.options.exe, ['--pipe', pipe, ...(this.options.extraArgs ?? [])], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child = child;
    child.stderr?.on('data', (d: Buffer) => this.log?.write(d));
    child.on('exit', (code) => {
      this.log?.write(`[shell] bridge exited with ${code}\n`);
      if (this.child !== child) return;
      this.child = null;
      this.rpc?.close();
      this.rpc = null;
      if (!this.stopping) {
        this.set({ up: false, reason: `the engine stopped (exit ${code})` });
        this.scheduleRestart();
      }
    });

    return new Promise<void>((resolve, reject) => {
      let out = '';
      const timer = setTimeout(() => reject(new Error('the engine did not start in time')), READY_TIMEOUT_MS);
      const onData = (d: Buffer) => {
        out += d.toString('utf8');
        const line = out.split(/\r?\n/).find((l) => l.startsWith('ready '));
        if (!line) {
          if (out.length > 4096) out = out.slice(-1024);
          return;
        }
        child.stdout?.off('data', onData);
        clearTimeout(timer);
        if (line.slice(6).trim() !== pipe) {
          reject(new Error('the engine served another pipe'));
          return;
        }
        this.attach(pipe).then(resolve, reject);
      };
      child.stdout?.on('data', onData);
      child.on('error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
      child.on('exit', () => {
        clearTimeout(timer);
        reject(new Error('the engine quit while starting'));
      });
    });
  }

  private async attach(pipe: string): Promise<void> {
    const socket = connect(`\\\\.\\pipe\\${pipe}`);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('error', reject);
    });
    const rpc = new RpcConnection(socket);
    this.rpc = rpc;
    rpc.on('notification', (method: string, params: unknown) => {
      if (method !== 'index.state') return;
      const index = validate.indexStatus(params);
      if (index) this.set({ up: true, index });
    });
    rpc.on('closed', () => {
      if (this.rpc === rpc) this.rpc = null;
    });
    const hello = (await rpc.request('bridge.hello')) as { protocol?: unknown };
    if (hello.protocol !== PROTOCOL) throw new Error(`the engine speaks protocol ${String(hello.protocol)}, not ${PROTOCOL}`);
    const index = validate.indexStatus(await rpc.request('index.status')) as IndexStatus | null;
    if (!index) throw new Error('the engine sent an unexpected status');
    this.set({ up: true, index });
  }

  private scheduleRestart(): void {
    if (this.stopping) return;
    const now = Date.now();
    this.restarts = this.restarts.filter((t) => now - t < 60_000);
    if (this.restarts.length >= RESTARTS_PER_MINUTE) {
      this.set({ up: false, reason: 'the engine keeps stopping; see bridge.log' });
      return;
    }
    this.restarts.push(now);
    const delay = 500 * 2 ** (this.restarts.length - 1);
    setTimeout(() => {
      if (!this.stopping && !this.child) void this.start();
    }, delay);
  }
}
