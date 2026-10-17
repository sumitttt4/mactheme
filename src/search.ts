import type { AppEntry } from "./types";
export function searchApps(apps: AppEntry[], query: string): AppEntry[] {
  const q = query.trim().toLocaleLowerCase();
  const rank = (a: AppEntry) => {
    const n = a.name.toLocaleLowerCase();
    return n === q
      ? 0
      : n.startsWith(q)
        ? 1
        : n.split(/\s+/).some((w) => w.startsWith(q))
          ? 2
          : 3;
  };
  return apps
    .filter((a) => !q || a.name.toLocaleLowerCase().includes(q))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .slice(0, 50);
}
export function dockEntries(apps: AppEntry[], pinned: string[]) {
  return pinned.flatMap((id) => {
    const a = apps.find((x) => x.id === id);
    return a ? [a] : [];
  });
}
