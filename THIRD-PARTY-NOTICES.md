# Third-party notices

- **WinShun** (https://github.com/LingCore/WinShun), MIT License, Copyright (c) LingCore
  and contributors. The bridge (`bridge/`) is built against WinShun's source and links
  its `wscore` and `wsmcp_proto` libraries. The source is not included here.
  `scripts/setup-upstream.ps1` clones it, and its `LICENSE` and `third_party/*/LICENSE`
  files stay in that clone. Keep them with any build output.
- **Qt 6** (open-source edition, LGPL-3.0 / GPL), linked dynamically by `wsbridge.exe`.
  That's fine for personal use. Re-check the obligations before distributing anything.
- **Electron**, **React**, **Vite** and the other npm packages: their licenses ship in
  `shell/node_modules/*/LICENSE`. Electron's Chromium notices are in
  `LICENSES.chromium.html` next to the packaged executable.
- **Geist Serif, Geist Mono** (Vercel, npm `geist@1.9.0`) and **Figtree** (npm
  `@fontsource-variable/figtree@5.3.0`), SIL Open Font License 1.1. These are used only
  by the web landing page. The font files and their licences are in `shell/src/web/fonts/`.
- **Paper Shaders** (`@paper-design/shaders-react@0.0.81`), Apache License 2.0. Draws the
  animated backdrop behind the demo on the web landing page only. The desktop app doesn't
  load it.
