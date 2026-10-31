import type { EngineState, SearchRow } from '../../shared/protocol';
import { formatCount } from '../lib/format';

function Status({ engine }: { engine: EngineState | null }) {
  if (!engine) return <span className="status"><i className="dot dot-wait" />Connecting…</span>;
  if (!engine.up)
    return (
      <span className="status status-down" title={engine.reason}>
        <i className="dot dot-down" />Engine offline
      </span>
    );
  const { state, items, access } = engine.index;
  const label =
    state === 'ready' ? `${formatCount(items)} items` : state === 'building' ? `Indexing · ${formatCount(items)}` : 'Loading index…';
  return (
    <span className="status" title={access === 'walk' ? 'Index service not in use: drives are walked (slower)' : undefined}>
      <i className={`dot ${state === 'ready' ? 'dot-ok' : 'dot-wait'}`} />
      {label}
      {access === 'walk' && <span className="status-note">walk mode</span>}
      {access === 'mock' && <span className="status-note">mock data</span>}
    </span>
  );
}

export function Footer({ engine, selected }: { engine: EngineState | null; selected: SearchRow | null }) {
  const revealable = selected && (selected.kind === 'file' || selected.kind === 'folder');
  return (
    <footer className="footer">
      <Status engine={engine} />
      <span className="hints">
        <span><kbd>↑</kbd><kbd>↓</kbd>Move</span>
        <span><kbd>Tab</kbd>Scope</span>
        {revealable && <span><kbd>Ctrl</kbd><kbd>↵</kbd>Show in folder</span>}
        <span><kbd>Esc</kbd>Close</span>
      </span>
    </footer>
  );
}
