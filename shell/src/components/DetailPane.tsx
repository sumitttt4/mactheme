import type { SearchRow } from '../../shared/protocol';
import { formatAge, formatSize, kindLabel } from '../lib/format';
import { Glyph } from './Glyph';

const SUBKIND: Record<string, string> = {
  desktop: 'Desktop app',
  store: 'Microsoft Store app',
  system: 'Built into Windows',
  package: 'Packaged app',
  settings: 'Opens in Settings',
  controlPanel: 'Opens in Control Panel',
  security: 'Opens in Windows Security',
  tool: 'System tool',
};

function fullDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function typeLine(row: SearchRow): string {
  switch (row.kind) {
    case 'file':
      return `${kindLabel(row)} file${row.size !== undefined ? ` · ${formatSize(row.size)}` : ''}`;
    case 'folder':
      return 'Folder';
    case 'app':
      return 'Application';
    case 'setting':
      return 'Windows setting';
    default:
      return kindLabel(row);
  }
}

export function DetailPane({ row, onOpen, onReveal }: { row: SearchRow; onOpen: () => void; onReveal: () => void }) {
  const isPath = row.kind === 'file' || row.kind === 'folder';
  const facts: [string, string][] = [];
  if (isPath) {
    if (row.folder) facts.push(['Where', row.folder]);
    if (row.modified) facts.push(['Modified', `${fullDate(row.modified)} · ${formatAge(row.modified)}`]);
    if (row.kind === 'file' && row.size !== undefined) facts.push(['Size', `${formatSize(row.size)} (${row.size.toLocaleString('en-US')} bytes)`]);
    if (row.offline) facts.push(['Status', 'On a share that cannot be reached now']);
  } else {
    if (row.subkind && SUBKIND[row.subkind]) facts.push(['Kind', SUBKIND[row.subkind]!]);
    if (row.elevatable) facts.push(['Admin', 'Can run as administrator']);
  }

  return (
    <aside className="pane" aria-label="Details" key={row.id}>
      <div className="pane-head">
        <Glyph row={row} size="large" />
        <h2 className="pane-title">{row.name}</h2>
        <p className="pane-type">{typeLine(row)}</p>
      </div>
      {facts.length > 0 && (
        <dl className="pane-facts">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd title={v}>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="pane-actions">
        <button className="btn btn-primary" onMouseDown={(e) => e.preventDefault()} onClick={onOpen}>
          {isPath ? 'Open' : row.kind === 'setting' ? 'Go to setting' : 'Launch'}
          <kbd>↵</kbd>
        </button>
        {isPath && (
          <button className="btn" onMouseDown={(e) => e.preventDefault()} onClick={onReveal}>
            Show in folder
            <span className="keys"><kbd>Ctrl</kbd><kbd>↵</kbd></span>
          </button>
        )}
      </div>
    </aside>
  );
}
