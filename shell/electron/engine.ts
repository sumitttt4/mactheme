// The engine as the main process sees it: the real bridge (bridgeEngine.ts)
// or, away from Windows or with --mock, a stand-in with made-up data
// (mockEngine.ts) for working on the UI.

import type { EventEmitter } from 'node:events';
import type { EngineState, LaunchPlan, Scope, SearchReply } from '../shared/protocol';

export interface Engine extends EventEmitter {
  start(): Promise<void>;
  stop(): void;
  state(): EngineState;
  search(text: string, scope: Scope, limit: number): Promise<SearchReply>;
  resolve(id: string): Promise<LaunchPlan>;
  // 'state' (EngineState): the engine came up, went down, or its index changed.
}
