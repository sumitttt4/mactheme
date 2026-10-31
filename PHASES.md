# Phases

Every phase ends with validation on the real Windows laptop: build, run, and a
side-by-side comparison with stock WinShun where one exists.

| # | Phase | State |
|---|---|---|
| 0 | Toolchain: build and test stock WinShun, install its service | **Yours to run** (`scripts/check-toolchain.ps1`, `setup-upstream.ps1`) |
| 1 | Bridge + search box | **Code written, not yet validated on Windows** |
| 2 | Search parity: recents, type filters, full query syntax, Ctrl+1..9, sort, favorites, drag out | Not started |
| 3 | Content search + previews (extract, content index, thumbnails, icons) | Not started |
| 4 | Clipboard history (ClipStore, watcher, OCR, pins, groups, multi-paste) | Not started |
| 5 | Plugins (host + bundled, all off by default) | Not started |
| 6 | Windows integration: double-Ctrl, dialog search bar, taskbar box, autostart | Not started |
| 7 | Capture tools, MCP relay, update story | Not started |

## Phase 1: what exists

- `bridge/`: `wsbridge.exe`, built from wscore's `IndexService`, `SearchEngine`,
  `AppCatalog` and `SystemCatalog`, plus upstream's `wsmcp_proto` pipe and JSON-RPC code.
  Methods: `bridge.hello`, `index.status`, `search.names` (names of files, folders, apps
  and Windows settings, pinyin included, scopes all/files/folders), and `item.resolve`.
  It also sends an `index.state` notification. Volume access goes through the index
  service when it answers, otherwise the bridge walks the drives (never direct, since
  it runs as the invoker).
- `shell/`: Electron main (spawns and supervises the bridge, restarts it with backoff,
  checks every IPC call), a sandboxed preload, and the React UI: search box, scope
  tabs, result list with highlighting, footer with index state, and dark and light
  themes. Ctrl+Space toggles the window, the arrows move, Enter opens, Ctrl+Enter
  reveals, and Esc hides.
- Verified here (Linux container, mock engine): typecheck, 11 unit tests, the renderer in
  Chromium in both themes, and the real Electron app driven end to end. The end-to-end
  run checked that the preload exposes only its 8 calls, the renderer has no Node, a
  web `fetch` is blocked, a bogus handle is refused, and the window sizes to its
  content.
- The C++ was syntax-checked against the upstream headers at the pinned commit
  (MinGW-w64 + Qt 6.4 headers, `-Wall -Wextra`). It produced no errors or warnings in
  `bridge/`.
- **Not verified:** an MSVC build and link, and runtime behaviour (real index, real
  launches). That's the first thing to do on the laptop.

## Phase 1 validation checklist (on the laptop)

- [ ] `scripts/build-bridge.ps1` builds `wsbridge` cleanly (MSVC /W4).
- [ ] `npm start`: Ctrl+Space shows the window. The footer goes from Loading to the item count, with `access` = service.
- [ ] Results for a file name, a folder, an app ("code"), a setting ("display"), and a pinyin query match stock WinShun's for the same text.
- [ ] Enter opens each kind and the opened program takes the foreground. Ctrl+Enter reveals files and folders.
- [ ] Esc and losing focus hide the window. The tray menu's Quit ends the bridge too (Task Manager shows no `wsbridge.exe`).
- [ ] Killing `wsbridge.exe` by hand: the footer shows Engine offline, then the bridge comes back.
- [ ] A second `wsbridge.exe --pipe Lode.Bridge.x` exits with "already running".
- [ ] Network: with Resource Monitor or `netstat -b`, neither `wsbridge.exe` nor the shell opens a connection.

## Gaps logged (deferred, not dropped)

- Run as administrator (an elevatable app with Ctrl+Shift+Enter): phase 2, with the rest of the keys.
- Ctrl+1..9 (open the nth row) landed early, with the redesign; the rest of phase 2 has not.
- Real file icons: phase 3 (ThumbnailProvider / FileIconProvider port). Phase 1 uses glyph tiles.
