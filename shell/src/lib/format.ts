import type { SearchRow } from '../../shared/protocol';

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function formatAge(seconds: number, now = Date.now() / 1000): string {
  const age = Math.max(0, now - seconds);
  if (age < 60) return 'just now';
  if (age < 3600) return `${Math.floor(age / 60)} min ago`;
  if (age < 86_400) return `${Math.floor(age / 3600)} h ago`;
  const days = Math.floor(age / 86_400);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const date = new Date(seconds * 1000);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

const SUBKIND_LABEL: Record<string, string> = {
  desktop: 'App',
  store: 'Store app',
  system: 'Windows app',
  package: 'App',
  settings: 'Settings',
  controlPanel: 'Control Panel',
  security: 'Windows Security',
  tool: 'System tool',
};

export function kindLabel(row: SearchRow): string {
  switch (row.kind) {
    case 'folder':
      return 'Folder';
    case 'file': {
      const dot = row.name.lastIndexOf('.');
      return dot > 0 && dot < row.name.length - 1 ? row.name.slice(dot + 1).toUpperCase() : 'File';
    }
    case 'app':
    case 'setting':
      return SUBKIND_LABEL[row.subkind ?? ''] ?? (row.kind === 'app' ? 'App' : 'Setting');
    case 'web':
      return 'Web';
    case 'plugin':
      return 'Plugin';
  }
}

// The second line of a row.
export function detail(row: SearchRow): string {
  if (row.kind === 'file' || row.kind === 'folder') return row.folder ?? row.path ?? '';
  return kindLabel(row);
}
