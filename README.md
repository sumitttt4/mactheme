# MacTheme

A real Tauri 2 desktop companion for Windows 11: translucent menu bars, a spring-magnified application Dock, Control Center, and keyboard application search. React + TypeScript + Motion in separate native windows, Rust + documented Windows APIs underneath.

**0.1.0 is an early Windows alpha. It cross-compiles to a Windows executable; Windows desktop/hardware integration has not been run in the authoring environment. Do not treat compilation as daily-use validation.**

## Run the portable build

1. Extract the entire Windows workflow artifact into a permanent folder, for example `C:\Users\<you>\Apps\MacTheme`.
2. Keep `mactheme.exe` and `WebView2Loader.dll` together.
3. Launch `mactheme.exe` on Windows 11. The Microsoft Edge WebView2 Evergreen Runtime must be installed. [Official WebView2 download](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
4. The original Windows taskbar stays under Windows control. Menu bars initially reserve 32 logical pixels **inside the existing Windows work area**, including a taskbar customized to the top.
5. Open the system mark at the left of the bar, the Settings icon in the Dock, or the tray menu to configure MacTheme.

The portable executable is unsigned. There is no installer, elevation requirement, Explorer injection, cloud service, or protected system-file modification. Do not enable startup or taskbar hiding until the visible shell works correctly on your machine.

## Everyday use

- **Alt+Space:** open/dismiss Spotlight. Search installed apps, use arrows and Enter to launch, and Escape to dismiss. Change the shortcut in Settings; a conflicting shortcut is rejected.
- **Dock:** click a pinned app to launch it; click an existing window to activate it; click the foreground app to minimize it. Windows can reject foreground focus, in which case the app is highlighted and an error is shown.
- **Pin:** use the pin beside a Spotlight result. Right-click a pinned Dock icon to open or remove it. Pins and preferences survive restarts. Uninstalled pins are omitted.
- **Control Center:** connectivity tiles open their exact Windows settings pages. Sound uses the default Core Audio output. Brightness uses WMI only where supported; otherwise the Display settings button is shown.
- **Installed apps:** Settings → Installed applications → Refresh after installing something new.
- **Themes:** light, dark, or follow the Windows/browser color preference. Fonts use Segoe UI Variable/Segoe UI; no Apple font or icon distribution.
- **Fullscreen:** bars and docks hide while a fullscreen foreground app is detected. This currently hides the companion on every display.

## Taskbar recovery

Taskbar hiding is **off until explicitly selected** in Settings. It temporarily saves Windows' original AppBar auto-hide state and the visible Explorer taskbar handles. An independent recovery process must signal readiness before any change occurs. The taskbar is restored on normal quit or when that process observes the main process exiting.

Recovery routes:

- **Ctrl+Alt+Shift+F12:** restore taskbar, unregister MacTheme AppBars, quit.
- Tray menu → **Restore Windows Taskbar** or **Restore Taskbar & Quit**.
- From the portable folder: `.\mactheme.exe --restore-taskbar`. This consumes the saved recovery journal without starting the shell.
- Windows Start, Task Manager, and Ctrl+Alt+Delete remain native. The app does not intercept them.

The guard cannot recover if both the main process and guard are killed together. Do not terminate the whole MacTheme process tree to test crash recovery; end only the main PID. Hiding under third-party taskbar customizers, Explorer restarts, multi-monitor changes, and crash restoration **still need Windows testing**. There is no attempt to repeatedly fight a customization tool that re-shows its taskbar.

## Develop on Windows

Install Node.js 22+, current stable Rust with the MSVC toolchain, Visual Studio Build Tools with **Desktop development with C++**, the Windows SDK, and WebView2 Runtime. See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

```powershell
git clone https://github.com/sumitttt4/mactheme.git
cd mactheme
npm ci
npm run tauri dev
```

Production executable and NSIS installer:

```powershell
npm run tauri build
# src-tauri\target\release\mactheme.exe
# src-tauri\target\release\bundle\nsis\*-setup.exe
```

The GitHub Actions **Windows build and checks** workflow builds these on Windows and uploads the `MacTheme-Windows-x64` artifact. Workflow checks are distinct from interactive integration testing.

UI-only browser inspection (never controls hardware):

```sh
npm run dev
# http://localhost:1420/?preview
# add &view=spotlight, &view=panel, or &view=settings
```

Without `?preview`, the browser clearly states that the app needs the desktop runtime. Preview data is explicitly a fixture; no simulated values appear in the native runtime.

## Verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:ui
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

Linux cross-build used for this delivery:

```sh
rustup target add x86_64-pc-windows-gnu
# Install the x86_64 MinGW compiler and binutils first.
npm run build
cargo check --manifest-path src-tauri/Cargo.toml --target x86_64-pc-windows-gnu
cargo clippy --manifest-path src-tauri/Cargo.toml --target x86_64-pc-windows-gnu -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --target x86_64-pc-windows-gnu --no-run
cargo build --manifest-path src-tauri/Cargo.toml --target x86_64-pc-windows-gnu --release --features custom-protocol
```

`custom-protocol` embeds the built frontend. Direct Cargo release builds must pass that feature; `tauri build` handles it automatically. GNU portable builds require the accompanying x64 WebView2 loader DLL.

## Implementation and limits

| Stage | Implemented | Validation here |
| --- | --- | --- |
| 1 · Shell | Native transparent borderless bar, clock, settings, tray, work-area placement, optional AppBar reservation | TypeScript production build; Windows Rust compilation |
| 2 · Dock | Start menu shortcut + Store app catalog, native executable icons, running window enumeration, activate/minimize, persisted pins, context menu, compositor transforms and springs | Search unit tests; browser interaction checks; Windows compilation |
| 3 · Controls | Battery through GetSystemPowerStatus; Core Audio sound; supported WMI brightness; actual adapter information and explicit Settings fallbacks | Compiled; hardware paths untested |
| 4 · Launcher & polish | Global shortcut, keyboard search, themes, auto-hide, monitor-aware windows, fullscreen hiding, recovery process, startup integration | Browser checks; Windows compilation; native desktop paths untested |

Known boundaries:

- Windows does not provide a universal macOS application menu. The bar shows active-app identity and functional Applications/Settings actions; there are no pretend File/Edit menus.
- Store applications without a resolvable executable icon use a clearly generic application glyph. Unknown running apps also use a generic glyph. Start menu executable icons are extracted from the user's own installation.
- Battery and foreground/window state use native events with a 30-second safety refresh. Wi-Fi/Bluetooth adapter information and brightness refresh when Control Center opens. There is no live SSID/device-list manager, direct radio toggle, DDC/CI external-monitor control, or continuous external-volume subscription.
- Dock hover uses Motion values and transforms without pointer-driven React state updates. Fixed slots avoid layout animation. Small displays show only the icons that fit; all apps remain searchable.
- Popovers use short, origin-aware transitions. Spotlight and keyboard result changes are immediate. Reduced-motion, reduced-transparency, high-contrast, focus indicators, and labelled controls are provided.
- Popup webviews are created lazily. Native updates are event-driven and coalesced; hardware inspection/indexing runs away from the UI thread. Startup app indexing uses built-in PowerShell/COM and may take several seconds. No CPU, RAM, or battery benchmark has been measured on Windows yet.
- This is macOS-inspired styling and independently implemented motion, not Apple's animation runtime, SF Symbols, proprietary fonts, or a full replacement Windows shell.

Preferences live in `%APPDATA%\me.sumitsharma.mactheme\settings.json`. The temporary taskbar journal is beside it. Quit restores the taskbar. Quit and disable Launch at login in Settings before uninstalling or deleting a portable folder.

See [WINDOWS-ACCEPTANCE.md](WINDOWS-ACCEPTANCE.md) for the first Windows run checklist.

## Landing page

The independent Next.js App Router site is in `landing/`. It uses Geist, Tailwind CSS, and Motion, with an interactive desktop preview and responsive theme selection.

```sh
npm ci --prefix landing
npm run landing:check
npm run landing:build
npm run landing:dev
```

For Vercel, import this repository, choose **Next.js**, and set **Root Directory** to `landing`. The site statically exports to `landing/out`. Keep access to files outside the root enabled because the app glyphs are shared with the desktop UI.

Download the `MacTheme-Windows-x64` artifact from a successful **Windows build and checks** workflow run for the latest executable and installer. The updated notch and four appearance presets are in the source. The preview runs only in the browser and does not operate hardware.
