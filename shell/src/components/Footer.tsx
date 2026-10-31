import type { EngineState, SearchRow } from '../../shared/protocol';
import { formatCount } from '../lib/format';

function Status({ engine }: { engine: EngineState | null }) {
  if (!engine)
    return (
      <span className="status">
        <i className="dot dot-wait" />
        Connecting…
      </span>
    );
  if (!engine.up)
    return (
      <span className="status status-down" title={engine.reason}>
        <i className="dot dot-down" />
        Engine offline
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
      {access === 'mock' && <span className="status-note">sample data</span>}
    </span>
  );
}

function took(us: number): string {
  return us < 1000 ? `${Math.max(1, Math.round(us))} µs` : `${(us / 1000).toFixed(us < 10_000 ? 1 : 0)} ms`;
}

export function Footer({ engine, selected, elapsedUs }: { engine: EngineState | null; selected: SearchRow | null; elapsedUs: number | null }) {
  const revealable = selected && (selected.kind === 'file' || selected.kind === 'folder');
  return (
    <footer className="footer">
      <Status engine={engine} />
      {elapsedUs !== null && <span className="took">{took(elapsedUs)}</span>}
      <span className="hints">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd>Move
        </span>
        <span>
          <kbd>Tab</kbd>Scope
        </span>
        {revealable && (
          <span>
            <kbd>Ctrl</kbd>
            <kbd>↵</kbd>Folder
          </span>
        )}
        <span>
          <kbd>Esc</kbd>Close
        </span>
      </span>
    </footer>
  );
}
