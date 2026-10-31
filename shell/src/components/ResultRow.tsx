import { memo } from 'react';
import type { SearchRow } from '../../shared/protocol';
import { detail, formatAge, formatSize, kindLabel } from '../lib/format';
import { highlight } from '../lib/highlight';
import { Glyph } from './Glyph';

interface Props {
  row: SearchRow;
  query: string;
  selected: boolean;
  onPick: (row: SearchRow) => void;
  onHover: (row: SearchRow) => void;
}

function meta(row: SearchRow): string {
  const parts: string[] = [];
  if (row.kind === 'file' && row.size !== undefined) parts.push(formatSize(row.size));
  if ((row.kind === 'file' || row.kind === 'folder') && row.modified) parts.push(formatAge(row.modified));
  return parts.join(' · ');
}

export const ResultRow = memo(function ResultRow({ row, query, selected, onPick, onHover }: Props) {
  const pieces = highlight(row.name, query);
  const info = meta(row);
  return (
    <li
      id={`row-${row.id}`}
      role="option"
      aria-selected={selected}
      className={`row${selected ? ' selected' : ''}${row.offline ? ' offline' : ''}`}
      onMouseMove={() => onHover(row)}
      onClick={() => onPick(row)}
    >
      <Glyph row={row} />
      <div className="row-text">
        <div className="row-name">
          {pieces.map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
        </div>
        <div className="row-detail" title={row.path}>
          {detail(row)}
        </div>
      </div>
      <div className="row-side">
        {selected ? (
          <span className="row-action">
            {row.kind === 'file' || row.kind === 'folder' ? 'Open' : row.kind === 'setting' ? 'Go' : 'Launch'}
            <kbd>↵</kbd>
          </span>
        ) : (
          <>
            {info && <span className="row-meta">{info}</span>}
            {(row.kind === 'file' || row.kind === 'folder') && <span className="row-kind">{kindLabel(row)}</span>}
          </>
        )}
      </div>
    </li>
  );
});
