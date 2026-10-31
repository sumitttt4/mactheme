// The web preview: no Electron, no bridge. window.lode answers from made-up
// rows in the page itself; opening anything only says what would happen.

import { mockSearch } from '../../shared/mockSearch';
import type { EngineState, LodeApi, SearchRow } from '../../shared/protocol';

const rows = new Map<string, SearchRow>();
let generation = 0;
const engineListeners = new Set<(s: EngineState) => void>();
let engine: EngineState = { up: true, index: { state: 'building', items: 412_330, access: 'mock' } };
setTimeout(() => {
  engine = { up: true, index: { state: 'ready', items: 1_284_112, access: 'mock' } };
  for (const l of engineListeners) l(engine);
}, 1400);

function preview(verb: string, id: string) {
  const row = rows.get(id);
  if (!row) return { ok: false, error: 'That row is gone; search again.' };
  return { ok: false, error: `Web preview: on Windows this would ${verb} “${row.name}”.` };
}

const api: LodeApi = {
  async search(text, scope, limit) {
    await new Promise((r) => setTimeout(r, 40));
    const gen = ++generation;
    const { rows: found, ...reply } = mockSearch(text, scope, limit, gen);
    for (const r of found) rows.set(r.id, r);
    return reply;
  },
  async open(id) {
    return preview('open', id);
  },
  async reveal(id) {
    return preview('show in its folder', id);
  },
  async engine() {
    return engine;
  },
  hide() {},
  resize() {},
  onShown() {
    return () => {};
  },
  onEngine(callback) {
    engineListeners.add(callback);
    return () => engineListeners.delete(callback);
  },
};

window.lode = api;
document.documentElement.classList.add('web-preview');
// The launcher is shown dark on the lavender page, whatever the system theme.
document.documentElement.dataset.theme = 'dark';
