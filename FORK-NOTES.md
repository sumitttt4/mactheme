# Fork notes

Every place this project differs from upstream WinShun, at
`8a90cc2343fc800cde1194aa7b4b9491e32852b2`. Keep it current: pulling upstream
fixes stays cheap only while this list stays short.

## Changes inside the upstream tree

| File | Change | Why | Upstream-able? |
|---|---|---|---|
| `CMakeLists.txt` | `add_subdirectory("${QUARRY_ROOT}/bridge" …)`, only when `QUARRY_ROOT` is defined (`patches/0001-add-bridge.patch`) | The bridge has to build against wscore and wsmcp_proto with upstream's targets and compile options. A stock build (no `QUARRY_ROOT`) is unchanged. | No, it's personal. |

Nothing in `src/core`, `src/service`, `src/extract` or `src/mcp` is changed.

## Choices that differ from the brief's wording

- **The bridge lives in `bridge/`, not `upstream/src/bridge/`.** The upstream clone is
  git-ignored, so this repo never carries WinShun's source (no fork, nothing
  republished). The patch above points CMake at `bridge/`.
- **Opening a row runs in Electron's main process, not in the bridge.** The bridge
  resolves the row into a launch plan (`item.resolve`): a path, a non-web URI, or a
  program with arguments. It works this out from what the engine found, never from
  client input. The main process then opens it. Reason: Windows only lets the
  *foreground* process hand focus to a program it starts. That is Electron when Enter
  is pressed, never the hidden bridge. Upstream gets the same effect with
  `AllowSetForegroundWindow` inside its own UI process. The renderer still only
  passes a row handle.
- **Ported subset of `src/app/platform/Shell.cpp`** (in `bridge/Launch.cpp`). Files and
  folders are opened by their handler. Apps go through `explorer.exe shell:AppsFolder\<id>`.
  Places go through `ws::splitCommand` (from wscore) and then a URI or program+args. Not yet
  ported: *run as administrator*, custom commands, the third-party file-manager choice,
  and multi-item reveal.

## Identifiers: ours vs stock

| What | Stock WinShun | This build | Status |
|---|---|---|---|
| Bridge pipe | — | `Quarry.Bridge.<random 128-bit>` per start | isolated |
| Bridge instance mutex | `Local\WinShun.Instance` (the app) | `Local\Quarry.Bridge.Instance` | isolated |
| Index folder | `%LOCALAPPDATA%\WinShun\…` | `%LOCALAPPDATA%\Quarry\index` | isolated (a second snapshot, a second index in memory while both run) |
| Electron data | — | `%APPDATA%\Quarry` | isolated |
| Windows service | `WinShun` | **uses the stock service** as a read-only client over `\\.\pipe\WinShun.Volumes` | **not isolated** |
| Service pipe | `WinShun.Volumes` | same | **not isolated** |
| Autostart task / Run key | `WinShun` | none yet (phase 6) | n/a |
| MCP pipe | `WinShun.Mcp.<SID>` | not served yet (phase 7) | n/a |
| Message-window classes, event log source, plugin data paths | various | not used yet | audit before phase 4–6 |

Until the service row is isolated, don't assume this build and stock WinShun can be
installed or uninstalled independently. Today the bridge needs the stock service, or
it falls back to walking the drives. Isolation is gated on open question 2 in the README.

## Behaviour not carried over (yet)

- History, favorites, start list, type filters, query-syntax help: phase 2.
- Content index (`IndexService::Options::content.enabled = false`), extract: phase 3.
- Web shortcuts and web suggestions are off. That's the network policy, not a gap.
- Crawl rules: upstream's defaults (`CrawlRules{}`), no settings UI yet.
