// What the bridge (wsbridge, ../bridge) speaks, as the shell uses it. Both the
// main process and the renderer import these types; only the main process
// talks to the bridge.

export type Scope = 'all' | 'files' | 'folders';
export const SCOPES: readonly Scope[] = ['all', 'files', 'folders'];

export type ResultKind = 'file' | 'folder' | 'app' | 'setting' | 'web' | 'plugin';

export interface SearchRow {
  id: string; // opaque handle: pass back to open or reveal the row
  kind: ResultKind;
  name: string;
  path?: string; // files and folders
  folder?: string; // files and folders: the folder it is in
  size?: number; // bytes
  modified?: number; // seconds since 1970, UTC
  offline?: boolean;
  subkind?: string; // apps and settings: desktop, store, settings, controlPanel ...
  elevatable?: boolean;
  recent?: boolean;
  exact?: boolean;
  approximate?: boolean;
}

export interface SearchReply {
  results: SearchRow[];
  total: number;
  elapsedUs: number;
}

export type IndexStateName = 'idle' | 'loading' | 'building' | 'ready';

export interface IndexStatus {
  state: IndexStateName;
  items: number;
  access: 'service' | 'walk' | 'mock';
}

export interface LaunchPlan {
  how: 'none' | 'path' | 'uri' | 'program';
  target?: string;
  arguments?: string[];
  canReveal: boolean;
}

// The engine's condition as the UI shows it.
export type EngineState =
  | { up: true; index: IndexStatus }
  | { up: false; reason: string };

// Limits shared by the renderer's input and the main process's checks; the
// bridge enforces its own (Params.h), these keep requests inside them.
export const MAX_QUERY_CHARS = 512;
export const MAX_HANDLE_CHARS = 32;
export const MAX_RESULTS = 200;

// The renderer's view of the main process (preload.ts exposes it as window.quarry).
export interface QuarryApi {
  search(text: string, scope: Scope, limit: number): Promise<SearchReply | { error: string }>;
  open(id: string): Promise<{ ok: boolean; error?: string }>;
  reveal(id: string): Promise<{ ok: boolean; error?: string }>;
  engine(): Promise<EngineState>;
  hide(): void;
  resize(height: number): void;
  onShown(callback: () => void): () => void;
  onEngine(callback: (state: EngineState) => void): () => void;
}
