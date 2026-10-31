import type { SearchRow } from '../../shared/protocol';

export type SectionKey = 'app' | 'setting' | 'folder' | 'file' | 'other';
export const SECTION_TITLE: Record<SectionKey, string> = {
  app: 'Apps',
  setting: 'Settings',
  folder: 'Folders',
  file: 'Files',
  other: 'More',
};

export interface Section {
  key: SectionKey;
  rows: { row: SearchRow; index: number }[]; // index: place in the flat, keyboard order
}

function keyOf(row: SearchRow): SectionKey {
  return row.kind === 'app' || row.kind === 'setting' || row.kind === 'folder' || row.kind === 'file' ? row.kind : 'other';
}

// Rows grouped by kind, groups in the order the engine first lists them, and
// the engine's order kept within each. Returns the flat order the keys move in.
export function sectionize(rows: SearchRow[]): { sections: Section[]; order: SearchRow[] } {
  const byKey = new Map<SectionKey, SearchRow[]>();
  for (const row of rows) {
    const k = keyOf(row);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(row);
  }
  const sections: Section[] = [];
  const order: SearchRow[] = [];
  for (const [key, list] of byKey) {
    sections.push({ key, rows: list.map((row) => ({ row, index: order.push(row) - 1 })) });
  }
  return { sections, order };
}
