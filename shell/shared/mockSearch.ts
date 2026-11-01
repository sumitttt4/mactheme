// Made-up rows and a rough ranking, shared by the mock engine (main process,
// `npm run mock`) and the web preview (the renderer alone, in a browser).
// No Node or DOM APIs here.

import type { Scope, SearchReply, SearchRow } from './protocol';

type Seed = Omit<SearchRow, 'id'>;

const DAY = 86_400;
const now = Math.floor(Date.now() / 1000);

function file(path: string, size: number, daysAgo: number): Seed {
  const slash = path.lastIndexOf('\\');
  return { kind: 'file', name: path.slice(slash + 1), path, folder: path.slice(0, slash), size, modified: now - daysAgo * DAY };
}
function folder(path: string, daysAgo: number): Seed {
  const slash = path.lastIndexOf('\\');
  return { kind: 'folder', name: path.slice(slash + 1), path, folder: path.slice(0, slash), modified: now - daysAgo * DAY };
}
const app = (name: string, subkind = 'desktop'): Seed => ({ kind: 'app', name, subkind, elevatable: subkind === 'desktop' });
const setting = (name: string, subkind = 'settings'): Seed => ({ kind: 'setting', name, subkind });

const U = 'C:\\Users\\me';
const SEEDS: Seed[] = [
  app('Visual Studio Code'),
  app('Visual Studio 2022'),
  app('Windows Terminal', 'store'),
  app('Firefox'),
  app('Figma'),
  app('Spotify', 'store'),
  app('Calculator', 'system'),
  app('Paint', 'system'),
  app('Photos', 'system'),
  app('Notepad', 'system'),
  app('Task Manager', 'system'),
  app('OBS Studio'),
  app('Blender'),
  app('Steam'),
  app('Discord'),
  app('PowerToys'),
  setting('Display', 'settings'),
  setting('Bluetooth & devices', 'settings'),
  setting('Sound', 'settings'),
  setting('Power & battery', 'settings'),
  setting('Windows Update', 'settings'),
  setting('Apps & features', 'settings'),
  setting('Default apps', 'settings'),
  setting('Device Manager', 'tool'),
  setting('Environment variables', 'controlPanel'),
  setting('Virus & threat protection', 'security'),
  setting('Night light', 'settings'),
  setting('Startup apps', 'settings'),
  folder(`${U}\\Documents`, 2),
  folder(`${U}\\Downloads`, 0),
  folder(`${U}\\Pictures\\Screenshots`, 1),
  folder(`${U}\\Projects`, 0),
  folder(`${U}\\Projects\\quarry`, 0),
  folder(`${U}\\Projects\\quarry\\shell`, 0),
  folder(`${U}\\Projects\\portfolio`, 12),
  folder('D:\\Photos\\2026', 30),
  folder('D:\\Music', 210),
  file(`${U}\\Documents\\Resume 2026.pdf`, 182_331, 9),
  file(`${U}\\Documents\\Resume 2025.docx`, 64_812, 340),
  file(`${U}\\Documents\\Tax return 2025.pdf`, 1_204_002, 120),
  file(`${U}\\Documents\\Budget.xlsx`, 48_221, 3),
  file(`${U}\\Documents\\Meeting notes.md`, 6_200, 1),
  file(`${U}\\Downloads\\node-v22.20.0-x64.msi`, 31_400_221, 14),
  file(`${U}\\Downloads\\invoice-0931.pdf`, 92_003, 4),
  file(`${U}\\Downloads\\wallpaper-dunes-4k.jpg`, 6_303_442, 6),
  file(`${U}\\Downloads\\Qt-online-installer.exe`, 44_102_331, 15),
  file(`${U}\\Pictures\\Screenshots\\Screenshot 2026-10-30 214503.png`, 402_119, 1),
  file(`${U}\\Pictures\\Screenshots\\Screenshot 2026-10-31 091122.png`, 388_002, 0),
  file(`${U}\\Projects\\quarry\\README.md`, 9_120, 0),
  file(`${U}\\Projects\\quarry\\identity.json`, 140, 0),
  file(`${U}\\Projects\\quarry\\shell\\package.json`, 1_402, 0),
  file(`${U}\\Projects\\quarry\\bridge\\Bridge.cpp`, 11_870, 0),
  file(`${U}\\Projects\\quarry\\bridge\\main.cpp`, 5_340, 0),
  file(`${U}\\Projects\\portfolio\\index.html`, 7_330, 12),
  file(`${U}\\Projects\\portfolio\\styles.css`, 12_004, 12),
  file(`${U}\\Projects\\portfolio\\hero.mp4`, 18_220_441, 40),
  file('D:\\Photos\\2026\\IMG_2041.HEIC', 2_903_112, 30),
  file('D:\\Photos\\2026\\IMG_2042.HEIC', 3_022_110, 30),
  file('D:\\Music\\Nils Frahm - Says.flac', 41_220_119, 210),
  file('D:\\Backups\\laptop-2026-09.zip', 8_330_119_220, 45),
  file('C:\\Windows\\System32\\drivers\\etc\\hosts', 824, 400),
  file('C:\\Program Files\\PowerToys\\PowerToys.exe', 5_402_331, 60),
];

function score(name: string, words: string[]): number {
  const n = name.toLowerCase();
  let total = 0;
  for (const w of words) {
    if (n === w) total += 100;
    else if (n.startsWith(w)) total += 60;
    else if (n.split(/[\s\-_.\\]+/).some((part) => part.startsWith(w))) total += 40;
    else if (n.includes(w)) total += 20;
    else return 0;
  }
  return total;
}

const ORDER: Record<string, number> = { app: 0, setting: 1, folder: 2, file: 3 };


// One search over the seeds; rows get handles "<generation>.<index>".
export function mockSearch(text: string, scope: Scope, limit: number, generation: number): SearchReply & { rows: SearchRow[] } {
  const started = Date.now();
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const pool = SEEDS.filter((s) =>
    scope === 'files' ? s.kind === 'file' || s.kind === 'folder' : scope === 'folders' ? s.kind === 'folder' : true,
  );
  const hits = words.length === 0 ? [] : pool.map((s) => ({ s, score: score(s.name, words) })).filter((h) => h.score > 0);
  hits.sort((a, b) => (scope === 'all' ? (ORDER[a.s.kind] ?? 9) - (ORDER[b.s.kind] ?? 9) : 0) || b.score - a.score);
  const results = hits.slice(0, limit).map((h, i) => {
    const row: SearchRow = { ...h.s, id: `${generation}.${i}` };
    if (h.s.name.toLowerCase() === text.trim().toLowerCase()) row.exact = true;
    return row;
  });
  return { results, rows: results, total: hits.length, elapsedUs: (Date.now() - started) * 1000 };
}
