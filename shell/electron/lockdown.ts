// The shell's security and network rules, applied before any window exists:
//   - no navigation, no new windows, no permissions (camera, notifications ...)
//   - no network: every request that is not the app's own files (or, in
//     development, the local Vite server) is cancelled
//   - no spellchecker (it downloads dictionaries)

import { app, session, type WebContents } from 'electron';

export function lockDown(devUrl: string | undefined): void {
  const devOrigin = devUrl ? new URL(devUrl).origin : null;
  const allowed = (url: string): boolean => {
    if (url.startsWith('file://') || url.startsWith('devtools://') || url.startsWith('data:')) return true;
    if (!devOrigin) return false;
    try {
      const u = new URL(url);
      return u.origin === devOrigin || (u.protocol === 'ws:' && u.host === new URL(devOrigin).host);
    } catch {
      return false;
    }
  };

  const ses = session.defaultSession;
  ses.webRequest.onBeforeRequest((details, callback) => {
    const ok = allowed(details.url);
    if (!ok) console.warn(`[quarry] blocked request (network policy): ${details.url}`);
    callback({ cancel: !ok });
  });
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  ses.setSpellCheckerEnabled(false);

  app.on('web-contents-created', (_event, contents: WebContents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.on('will-navigate', (event) => event.preventDefault());
    contents.on('will-redirect', (event) => event.preventDefault());
    contents.on('will-attach-webview', (event) => event.preventDefault());
  });
}
