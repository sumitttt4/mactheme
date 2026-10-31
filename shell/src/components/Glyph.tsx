import type { SearchRow } from '../../shared/protocol';
import { familyOf, type Family } from '../lib/fileType';

type GlyphName = Family | 'folder' | 'app' | 'setting' | 'web' | 'plugin';

// Hand-drawn 20×20 line glyphs; one stroke weight, rounded joins.
const PATHS: Record<GlyphName, string> = {
  folder: 'M2.75 6.25a1.5 1.5 0 0 1 1.5-1.5h3.4l1.6 1.7h6.5a1.5 1.5 0 0 1 1.5 1.5v6.8a1.5 1.5 0 0 1-1.5 1.5H4.25a1.5 1.5 0 0 1-1.5-1.5Z',
  app: 'M3.5 3.5h5v5h-5ZM11.5 3.5h5v5h-5ZM3.5 11.5h5v5h-5ZM11.5 11.5h5v5h-5Z',
  setting:
    'M10 7.25a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5ZM10 2.75v2M10 15.25v2M17.25 10h-2M4.75 10h-2M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3 4.9 4.9',
  doc: 'M5 2.75h6.5l3.5 3.5v11H5ZM11.5 2.75v3.5H15M7.5 10h5M7.5 12.75h5M7.5 15.25h3',
  pdf: 'M5 2.75h6.5l3.5 3.5v11H5ZM11.5 2.75v3.5H15M7.25 14.5c1.5-1 2.75-3.25 3-5.5.25 2 1.5 3.5 3 3.75-1.75 0-4.25.5-6 1.75Z',
  sheet: 'M3.25 4.25h13.5v11.5H3.25ZM3.25 8h13.5M3.25 11.75h13.5M8 4.25v11.5',
  slides: 'M2.75 3.75h14.5v9.5H2.75ZM10 13.25v3M7 16.75h6M6.5 10.25l2.25-2.5 2 1.75 2.75-3',
  image: 'M3.25 3.75h13.5v12.5H3.25ZM3.25 13l3.75-3.75 3 3 2-2 3.75 3.75M12.5 7.25h.01',
  video: 'M2.75 5h10.5v10H2.75ZM13.25 8.5l4-2.25v7.5l-4-2.25',
  audio: 'M7.25 14.5V4.25l9-1.5v10.5M7.25 14.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM16.25 13.25a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  code: 'm7 6.25-3.75 3.75L7 13.75M13 6.25l3.75 3.75L13 13.75M11.25 4.5l-2.5 11',
  archive: 'M3.25 3.5h13.5v3.25H3.25ZM4.25 6.75h11.5v9.75H4.25ZM8.25 9.75h3.5',
  exe: 'M2.75 4.25h14.5v11.5H2.75ZM2.75 7.25h14.5M6.25 10.5l2 1.75-2 1.75M10.25 14h3.5',
  text: 'M4.25 4.5h11.5M4.25 8.25h11.5M4.25 12h11.5M4.25 15.75h7',
  other: 'M5 2.75h6.5l3.5 3.5v11H5ZM11.5 2.75v3.5H15',
  web: 'M10 2.75a7.25 7.25 0 1 1 0 14.5 7.25 7.25 0 0 1 0-14.5ZM2.75 10h14.5M10 2.75c2 2.25 2.75 4.5 2.75 7.25S12 15 10 17.25C8 15 7.25 12.75 7.25 10S8 4.95 10 2.75Z',
  plugin: 'M8 3.25h4v3h-4ZM5.25 6.25h9.5v4.5a4.75 4.75 0 0 1-9.5 0ZM10 15.5v1.75',
};

export function glyphFor(row: SearchRow): GlyphName {
  if (row.kind === 'file') return familyOf(row.name);
  return row.kind;
}

function extension(row: SearchRow): string | null {
  if (row.kind !== 'file') return null;
  const dot = row.name.lastIndexOf('.');
  const ext = dot > 0 ? row.name.slice(dot + 1) : '';
  return ext && ext.length <= 5 ? ext.toUpperCase() : null;
}

export function Glyph({ row, size = 'row' }: { row: SearchRow; size?: 'row' | 'large' }) {
  const name = glyphFor(row);
  const ext = size === 'large' ? extension(row) : null;
  const px = size === 'large' ? 30 : 20;
  return (
    <span className={`tile tile-${name}${size === 'large' ? ' tile-large' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 20 20" width={px} height={px} fill="none" stroke="currentColor" strokeWidth={size === 'large' ? 1.3 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d={PATHS[name]} />
      </svg>
      {ext && <span className="tile-ext">{ext}</span>}
    </span>
  );
}

export function SearchIcon() {
  return (
    <svg className="search-icon" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <circle cx="8.75" cy="8.75" r="5.5" />
      <path d="m13 13 4.25 4.25" />
    </svg>
  );
}
