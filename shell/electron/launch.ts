// Carries out a launch plan the bridge worked out for a row. Runs here, in
// the main process, because this is the foreground process when Enter is
// pressed: what it starts may take the foreground (FORK-NOTES.md, "Opening").

import { spawn } from 'node:child_process';
import { shell } from 'electron';
import type { LaunchPlan } from '../shared/protocol';

export async function open(plan: LaunchPlan): Promise<{ ok: boolean; error?: string }> {
  switch (plan.how) {
    case 'path': {
      const error = await shell.openPath(plan.target!);
      return error ? { ok: false, error } : { ok: true };
    }
    case 'uri':
      await shell.openExternal(plan.target!, { activate: true });
      return { ok: true };
    case 'program':
      return new Promise((resolve) => {
        const child = spawn(plan.target!, plan.arguments ?? [], { detached: true, stdio: 'ignore', windowsHide: false });
        child.once('error', (e) => resolve({ ok: false, error: e.message }));
        child.once('spawn', () => {
          child.unref();
          resolve({ ok: true });
        });
      });
    case 'none':
      return { ok: false, error: 'this row cannot be opened yet' };
  }
}

export function reveal(plan: LaunchPlan): { ok: boolean; error?: string } {
  if (!plan.canReveal || plan.how !== 'path' || !plan.target) return { ok: false, error: 'only files and folders can be revealed' };
  shell.showItemInFolder(plan.target);
  return { ok: true };
}
