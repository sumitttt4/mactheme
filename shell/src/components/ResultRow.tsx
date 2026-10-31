import { memo } from 'react';
import type { SearchRow } from '../../shared/protocol';
import { detail, formatAge } from '../lib/format';
import { highlight } from '../lib/highlight';
import { Glyph } from './Glyph';

interface Props {
  row: SearchRow;
  index: number;
  query: string;
  selected: boolean;
  onPick: (index: number) => void;
  onHover: (index: number) => void;
}

export const ResultRow = memo(function ResultRow({ row, index, query, selected, onPick, onHover }: Props) {
  const pieces = highlight(row.name, query);
  const age = (row.kind === 'file' || row.kind === 'folder') && row.modified ? formatAge(row.modified) : null;
  return (
    <li
      id={`row-${row.id}`}
      role="option"
      aria-selected={selected}
      className={`row${selected ? ' selected' : ''}${row.offline ? ' offline' : ''}`}
      style={{ '--i': Math.min(index, 10) } as React.CSSProperties}
      onMouseMove={() => onHover(index)}
      onClick={() => onPick(index)}
    >
      <Glyph row={row} />
      <div className="row-text">
        <div className="row-name">
          {pieces.map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
          {row.exact && <span className="badge">Exact</span>}
        </div>
        <div className="row-detail">{detail(row)}</div>
      </div>
      {age && <span className="row-meta">{age}</span>}
      {index < 9 && <kbd className="row-num" title={`Ctrl+${index + 1}`}>{index + 1}</kbd>}
    </li>
  );
});
