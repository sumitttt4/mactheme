// Checks on everything that crosses into the main process: the renderer's
// arguments (it is sandboxed, but still treated as untrusted) and the
// bridge's replies (kept to the shape the UI expects).

import {
  MAX_HANDLE_CHARS,
  MAX_QUERY_CHARS,
  MAX_RESULTS,
  SCOPES,
  type IndexStatus,
  type LaunchPlan,
  type ResultKind,
  type Scope,
  type SearchReply,
  type SearchRow,
} from '../shared/protocol';

const CONTROL = /[\u0000-\u001f\u007f]/;

export function queryText(value: unknown): string | null {
  return typeof value === 'string' && value.length <= MAX_QUERY_CHARS && !CONTROL.test(value) ? value : null;
}

export function scope(value: unknown): Scope | null {
  return typeof value === 'string' && (SCOPES as readonly string[]).includes(value) ? (value as Scope) : null;
}

export function limit(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAX_RESULTS ? (value as number) : null;
}

export function handle(value: unknown): string | null {
  return typeof value === 'string' && /^[0-9]+\.[0-9]+$/.test(value) && value.length <= MAX_HANDLE_CHARS ? value : null;
}

export function windowHeight(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 40 && value <= 2000 ? Math.round(value) : null;
}

const KINDS: readonly ResultKind[] = ['file', 'folder', 'app', 'setting', 'web', 'plugin'];
const str = (v: unknown, max = 4096): v is string => typeof v === 'string' && v.length <= max;
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function row(value: unknown): SearchRow | null {
  if (typeof value !== 'object' || value === null) return null;
  const r = value as Record<string, unknown>;
  if (!str(r.id, MAX_HANDLE_CHARS) || !str(r.name, 1024) || !KINDS.includes(r.kind as ResultKind)) return null;
  const out: SearchRow = { id: r.id, kind: r.kind as ResultKind, name: r.name };
  if (str(r.path, 32768)) out.path = r.path;
  if (str(r.folder, 32768)) out.folder = r.folder;
  if (num(r.size)) out.size = r.size;
  if (num(r.modified)) out.modified = r.modified;
  if (str(r.subkind, 32)) out.subkind = r.subkind;
  for (const flag of ['offline', 'elevatable', 'recent', 'exact', 'approximate'] as const) {
    if (r[flag] === true) out[flag] = true;
  }
  return out;
}

export function searchReply(value: unknown): SearchReply | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.results)) return null;
  const results: SearchRow[] = [];
  for (const item of v.results.slice(0, MAX_RESULTS)) {
    const r = row(item);
    if (r) results.push(r);
  }
  return { results, total: num(v.total) ? v.total : results.length, elapsedUs: num(v.elapsedUs) ? v.elapsedUs : 0 };
}

export function indexStatus(value: unknown): IndexStatus | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const states = ['idle', 'loading', 'building', 'ready'];
  if (!states.includes(v.state as string) || !num(v.items)) return null;
  const access = v.access === 'service' || v.access === 'walk' || v.access === 'mock' ? v.access : 'walk';
  return { state: v.state as IndexStatus['state'], items: v.items, access };
}

// Schemes a place in Windows opens through; nothing that reaches the web or
// runs script (network policy, and the bridge never lists such rows anyway).
const BLOCKED_SCHEMES = new Set(['http', 'https', 'ftp', 'file', 'javascript', 'data', 'vbscript', 'blob', 'ws', 'wss']);

export function launchPlan(value: unknown): LaunchPlan | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const canReveal = v.canReveal === true;
  switch (v.how) {
    case 'none':
      return { how: 'none', canReveal };
    case 'path':
      return str(v.target, 32768) && v.target.length > 0 ? { how: 'path', target: v.target, canReveal } : null;
    case 'uri': {
      if (!str(v.target, 2048)) return null;
      const scheme = /^([a-z][a-z0-9+.-]+):/i.exec(v.target)?.[1]?.toLowerCase();
      if (!scheme || BLOCKED_SCHEMES.has(scheme)) return null;
      return { how: 'uri', target: v.target, canReveal: false };
    }
    case 'program': {
      if (!str(v.target, 32768) || v.target.length === 0) return null;
      const args = Array.isArray(v.arguments) ? v.arguments : [];
      if (!args.every((a) => str(a, 32768))) return null;
      return { how: 'program', target: v.target, arguments: args as string[], canReveal: false };
    }
    default:
      return null;
  }
}
