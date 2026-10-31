// A stand-in engine with made-up rows (shared/mockSearch.ts): for working on
// the UI away from Windows (`npm run mock`), and for the shell's own tests.

import { EventEmitter } from 'node:events';
import { mockSearch } from '../shared/mockSearch';
import type { EngineState, LaunchPlan, Scope, SearchReply, SearchRow } from '../shared/protocol';
import type { Engine } from './engine';

export class MockEngine extends EventEmitter implements Engine {
  private current: EngineState = { up: false, reason: 'starting' };
  private generation = 0;
  private rows = new Map<string, SearchRow>();

  constructor(private readonly latencyMs = 25) {
    super();
  }

  state(): EngineState {
    return this.current;
  }

  async start(): Promise<void> {
    this.set({ up: true, index: { state: 'building', items: 412_330, access: 'mock' } });
    setTimeout(() => this.set({ up: true, index: { state: 'ready', items: 1_284_112, access: 'mock' } }), 1500);
  }

  stop(): void {}

  async search(text: string, scope: Scope, limit: number): Promise<SearchReply> {
    await new Promise((r) => setTimeout(r, this.latencyMs));
    const gen = ++this.generation;
    const { rows, ...reply } = mockSearch(text, scope, limit, gen);
    for (const row of rows) this.rows.set(row.id, row);
    for (const id of this.rows.keys()) if (Number(id.split('.')[0]) < gen - 2) this.rows.delete(id);
    return reply;
  }

  async resolve(id: string): Promise<LaunchPlan> {
    const row = this.rows.get(id);
    if (!row) throw new Error('no such row (stale or never listed)');
    // Nothing is started for made-up rows.
    return { how: 'none', canReveal: row.kind === 'file' || row.kind === 'folder' };
  }

  private set(state: EngineState): void {
    this.current = state;
    this.emit('state', state);
  }
}
