# Lode

> **Lode** is a placeholder name, and the icon is a placeholder too (`identity.json`,
> `"placeholder": true`). Both are open question 1 below. Change the name in
> `identity.json`: the bridge's CMake and the shell both read it from there.

A personal Windows launcher. The interface is React + TypeScript in Electron. The engine
is [WinShun](https://github.com/LingCore/WinShun)'s C++ search core (MIT): its NTFS
index service, name search with pinyin, and its app and Windows-settings catalogs. A
small C++ bridge serves that engine over a named pipe.

```
 ┌──────────── shell/ (Electron) ────────────┐        ┌──── bridge/ wsbridge.exe ────┐
 │ renderer: React, sandboxed, no Node       │        │ JSON-RPC 2.0 lines            │
 │   └─ window.lode (preload: 8 named calls) │        │  bridge.hello  index.status   │
 │ main: window, hotkey, tray, checks,       │──pipe──│  search.names  item.resolve   │
 │       opens rows (foreground rights)      │        │ wscore: IndexService,         │
 └───────────────────────────────────────────┘        │  SearchEngine, AppCatalog,    │
                                                      │  SystemCatalog                │
                                                      └───────────┬──────────────────┘
                                                                  │ \\.\pipe\WinShun.Volumes
                                                      WinShunService.exe (MFT + USN journal)
```

The rule: the bridge exposes data and actions, and every pixel and every UI string lives in React.

## Layout

| Path | What |
|---|---|
| `identity.json` | Project name and identifiers: the single source. |
| `bridge/` | `wsbridge`, C++20, Qt Core + Sql + Win32. Built inside the upstream clone. |
| `shell/` | Electron app: `electron/` main + preload, `src/` React UI, `shared/` protocol types, `tests/`. |
| `patches/` | The one change to upstream's tree (see `FORK-NOTES.md`). |
| `scripts/` | Windows PowerShell: toolchain check, upstream setup, bridge build. |
| `upstream/` | Local WinShun clone. **Git-ignored and never committed.** |

## Try the UI anywhere (mock engine)

No Windows or C++ needed. Made-up rows and the same IPC path:

```sh
cd shell
npm install
npm run mock        # Electron with the mock engine
npm test            # framing, RPC client, validation, mock engine
```

## Windows, for real

### Phase 0: prove the toolchain (gate, do not skip)

1. `./scripts/check-toolchain.ps1` reports what's installed and changes nothing.
   Install whatever is missing yourself: VS 2022 "Desktop development with C++",
   Qt 6.8+ `msvc2022_64` (6.12 recommended), CMake 3.25+, Ninja, Node LTS.
2. `./scripts/setup-upstream.ps1` clones WinShun into `upstream/` at the pinned commit
   and applies the patch on a local branch. The push URL is disabled.
3. Build and test **stock** WinShun: `cd upstream; ./scripts/build.ps1`. The patch is
   inert without `LODE_ROOT`.
4. Install the built copy and its service (one admin consent). Confirm search and the
   clipboard work.

### Phase 1: bridge + search box

```powershell
./scripts/build-bridge.ps1        # builds wsbridge, deploys it + Qt DLLs to shell/bridge-bin/
cd shell; npm install; npm start  # Ctrl+Space toggles the window
```

`npm run dev` gives hot reload. `LODE_BRIDGE_EXE=<path>` points the shell at another
bridge build. The bridge's stderr goes to `%APPDATA%\Lode\logs\bridge.log`.

Keys: type to search · `↑` `↓` `PgUp` `PgDn` move · `Enter` open · `Ctrl+Enter` show in
folder · `Tab` / `Shift+Tab` cycle the scope (All / Files / Folders) · `Esc` hide.

If Ctrl+Space is taken (Chinese and Japanese IMEs use it), the shell falls back to
Ctrl+Alt+Space and says so in the tray tooltip. Bare double-Ctrl arrives in phase 6.

## Security

**Bridge** (`bridge/Bridge.h` has the full list):
- Upstream's pipe server: a DACL for the user, the administrators and SYSTEM, a medium
  integrity label, no remote clients, and `FILE_FLAG_FIRST_PIPE_INSTANCE`. On top of
  that, every client token must be **this user in this Windows session**
  (`ClientCheck.cpp`). Anything else is disconnected.
- A random pipe name per start, made by the shell, so it can't be squatted.
- A fixed method table. Unknown methods get `-32601`. There is no command, eval, file
  or path endpoint.
- Strict params: unknown keys are rejected, strings are capped with no control
  characters, and integers are range-checked. Lines are capped at 64 KiB and the
  connection is dropped past that. Searches time out at 10 s.
- Actions name a row by an opaque handle from a recent search, never by a path.

**Shell**:
- `contextIsolation`, `sandbox`, no `nodeIntegration`, no remote module, DevTools off
  when packaged.
- One preload exposing 8 named calls. The main process re-validates every argument
  and checks the sender frame.
- No navigation, no new windows, no permission grants, no webviews.
- CSP: `default-src 'none'`, scripts only from the app's own files, `connect-src 'none'`.

## Network policy

No network, by default and everywhere:
- The shell cancels every request that isn't the app's own files (or, in dev, the
  local Vite server). The spellchecker, which downloads dictionaries, is off.
- The bridge leaves web shortcuts and suggestions out of every search. Nothing in
  phase 1 opens a socket.
- Later remote features each get their own switch, off by default, with a note of
  what leaves the PC: update checks, site icons, the plugin library, translate,
  semantic cloud embeddings, LocalSend.

## Status

See [`PHASES.md`](PHASES.md). Phase 1 code is written and the shell is tested. The C++ has been
syntax-checked but **not yet built with MSVC or run**. That happens on the Windows laptop.

## Open questions (yours to decide)

1. Project name and icon. "Lode" and the lens-over-ore mark are placeholders.
2. Does stock WinShun stay installed during development for side-by-side comparison?
   If yes, identifier isolation (`FORK-NOTES.md`) comes first, including our own
   service name and pipe.
3. If time gets tight, which later phases move first. Nothing gets dropped silently.

License notices: [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
