#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod model;
#[cfg(windows)]
mod native;
#[cfg(not(windows))]
fn main() {
    eprintln!("MacTheme is built for Windows 11. Use npm run dev for the labelled UI preview.");
}
#[cfg(windows)]
mod desktop {
    use crate::{model::*, native};
    use std::{
        path::{Path, PathBuf},
        process::Command,
        sync::{Arc, Mutex},
        time::{Duration, Instant},
    };
    use tauri::{
        menu::{Menu, MenuItem},
        tray::TrayIconBuilder,
        Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow,
        WebviewWindowBuilder,
    };
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
    use windows_sys::Win32::{
        Foundation::{HWND, RECT},
        UI::WindowsAndMessaging::*,
    };
    const EMERGENCY: &str = "Control+Alt+Shift+F12";
    static RECOVERY_GUARD: Mutex<Option<std::process::Child>> = Mutex::new(None);
    #[derive(Clone)]
    pub struct Shared(pub Arc<Mutex<Snapshot>>);
    impl Shared {
        fn lock(&self) -> std::sync::MutexGuard<'_, Snapshot> {
            self.0.lock().unwrap_or_else(|e| e.into_inner())
        }
    }
    fn emit(app: &tauri::AppHandle) {
        let s = app.state::<Shared>();
        let data = s.lock().clone();
        for (label, window) in app.webview_windows() {
            let mut payload = data.clone();
            if !label.starts_with("dock-") && label != "spotlight" {
                payload.apps.clear();
                payload.running.clear();
            }
            let _ = window.emit("shell-state", payload);
        }
    }
    fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
        let p = app.path().app_config_dir().map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&p).map_err(|e| e.to_string())?;
        Ok(p.join("settings.json"))
    }
    fn journal(app: &tauri::AppHandle) -> Result<PathBuf, String> {
        Ok(config_path(app)?.with_file_name("taskbar-recovery.json"))
    }
    fn restore_journal(path: &Path) {
        if let Ok(bytes) = std::fs::read(path) {
            if let Ok(recovery) = serde_json::from_slice::<TaskbarRecovery>(&bytes) {
                native::set_taskbar_state(recovery.state);
                let current = native::taskbars();
                for h in recovery.handles {
                    if current.contains(&h) {
                        native::set_visible(h, true);
                    }
                }
            }
        }
        let _ = std::fs::remove_file(path);
    }
    fn restore(app: &tauri::AppHandle) {
        if let Ok(p) = journal(app) {
            restore_journal(&p)
        }
        if let Some(mut child) = RECOVERY_GUARD
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .take()
        {
            let _ = child.kill();
            let _ = child.wait();
        }
        let s = app.state::<Shared>();
        let mut s = s.lock();
        s.status.taskbar_visible = native::taskbars().iter().any(|h| native::visible(*h));
        s.status.taskbar_hidden_by_us = false;
    }
    fn cleanup(app: &tauri::AppHandle) {
        restore(app);
        native::cleanup_appbars();
    }
    fn ps(script: &str, args: &[String]) -> Result<String, String> {
        let mut cmd = Command::new("powershell.exe");
        native::hide_console_process(&mut cmd);
        use base64::Engine;
        let bytes: Vec<u8> = script.encode_utf16().flat_map(u16::to_le_bytes).collect();
        let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
        cmd.args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-EncodedCommand",
            &encoded,
        ]);
        if !args.is_empty() {
            return Err("Encoded scripts do not accept positional arguments".into());
        }
        let out = cmd.output().map_err(|e| e.to_string())?;
        if !out.status.success() {
            return Err(String::from_utf8_lossy(&out.stderr)
                .trim()
                .chars()
                .take(350)
                .collect());
        }
        Ok(String::from_utf8_lossy(&out.stdout)
            .trim_start_matches('\u{feff}')
            .trim()
            .into())
    }
    fn read_catalog() -> Result<Vec<AppEntry>, String> {
        let json = ps(include_str!("../../native-scripts/catalog.ps1"), &[])?;
        if json.is_empty() {
            return Ok(vec![]);
        }
        serde_json::from_str::<Vec<AppEntry>>(&json)
            .or_else(|_| serde_json::from_str::<AppEntry>(&json).map(|a| vec![a]))
            .map_err(|e| format!("Application indexing failed: {e}"))
    }
    fn refresh_hardware(app: &tauri::AppHandle) {
        let result = ps(include_str!("../../native-scripts/hardware.ps1"), &[])
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).map_err(|e| e.to_string()));
        let vol = native::volume(None).ok();
        {
            let state = app.state::<Shared>();
            let mut s = state.lock();
            if let Ok(v) = result {
                s.status.brightness = v["brightness"].as_u64().map(|n| n as u8);
                if let Some(w) = v["wifi"].as_str() {
                    s.status.wifi = w.into()
                }
                if let Some(b) = v["bluetooth"].as_str() {
                    s.status.bluetooth = b.into()
                }
            }
            s.status.volume = vol.map(|x| x.0);
            s.status.muted = vol.map(|x| x.1).unwrap_or(false);
        }
        emit(app);
    }
    fn hwnd(w: &WebviewWindow) -> Result<HWND, String> {
        w.hwnd().map(|h| h.0 as HWND).map_err(|e| e.to_string())
    }
    fn build_window(
        app: &tauri::AppHandle,
        label: &str,
        view: &str,
        w: f64,
        h: f64,
        focus: bool,
    ) -> Result<WebviewWindow, String> {
        let win = WebviewWindowBuilder::new(
            app,
            label,
            WebviewUrl::App(format!("index.html?view={view}").into()),
        )
        .title(format!("MacTheme · {view}"))
        .inner_size(w, h)
        .transparent(true)
        .decorations(false)
        .shadow(false)
        .resizable(false)
        .skip_taskbar(true)
        .always_on_top(true)
        .visible(false)
        .focused(false)
        .focusable(focus)
        .build()
        .map_err(|e| e.to_string())?;
        if !focus {
            native::no_activate(hwnd(&win)?)
        }
        native::material(hwnd(&win)?, false);
        let a = app.clone();
        let l = label.to_owned();
        win.on_window_event(move |e| {
            if matches!(e, tauri::WindowEvent::Focused(false)) && l.starts_with("dock-") {
                if let Some(w) = a.get_webview_window(&l) {
                    let _ = w.emit("dock-menu-close", ());
                }
            }
            if matches!(e, tauri::WindowEvent::Focused(false))
                && ["panel", "spotlight"].contains(&l.as_str())
            {
                if let Some(w) = a.get_webview_window(&l) {
                    let _ = w.hide();
                }
            }
        });
        Ok(win)
    }
    fn layout(app: &tauri::AppHandle) -> Result<(), String> {
        native::cleanup_appbars();
        let monitors = app.available_monitors().map_err(|e| e.to_string())?;
        let settings = app.state::<Shared>().lock().settings.clone();
        let mut handles = vec![];
        let count = monitors.len();
        for (i, m) in monitors.iter().enumerate() {
            let scale = m.scale_factor();
            let pos = m.position();
            let size = m.size();
            let mut work = RECT {
                left: pos.x,
                top: pos.y,
                right: pos.x + size.width as i32,
                bottom: pos.y + size.height as i32,
            };
            unsafe {
                use windows_sys::Win32::Graphics::Gdi::*;
                let monitor = MonitorFromPoint(
                    windows_sys::Win32::Foundation::POINT {
                        x: pos.x + 1,
                        y: pos.y + 1,
                    },
                    MONITOR_DEFAULTTONEAREST,
                );
                let mut info: MONITORINFO = std::mem::zeroed();
                info.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
                if GetMonitorInfoW(monitor, &mut info) != 0 {
                    work = info.rcWork;
                }
            }
            let bar_label = format!("bar-{i}");
            let dock_label = format!("dock-{i}");
            let bar = if let Some(w) = app.get_webview_window(&bar_label) {
                w
            } else {
                build_window(app, &bar_label, "bar", 800., 32., false)?
            };
            let dock = if let Some(w) = app.get_webview_window(&dock_label) {
                w
            } else {
                build_window(app, &dock_label, "dock", 600., 160., false)?
            };
            let notch_label = format!("notch-{i}");
            let notch = match app.get_webview_window(&notch_label) {
                Some(w) => w,
                None => build_window(app, &notch_label, "notch", 360., 168., false)?,
            };
            notch.set_size(PhysicalSize::new((360. * scale) as u32, (168. * scale) as u32)).map_err(|e| e.to_string())?;
            notch.set_position(PhysicalPosition::new(work.left + ((work.right - work.left) - (360. * scale) as i32) / 2, work.top)).map_err(|e| e.to_string())?;
            native::notch_region(hwnd(&notch)?, scale, false);
            if settings.show_notch && !app.state::<Shared>().lock().status.fullscreen {
                let _ = notch.show();
            } else {
                let _ = notch.hide();
            }
            let height = (32. * scale).round() as i32;
            let requested = RECT {
                left: work.left,
                top: work.top,
                right: work.right,
                bottom: work.top + height,
            };
            let rect =
                native::appbar(hwnd(&bar)?, requested, settings.reserve_space).unwrap_or(requested);
            if settings.reserve_space {
                handles.push(hwnd(&bar)? as usize)
            }
            bar.set_position(PhysicalPosition::new(rect.left, rect.top))
                .map_err(|e| e.to_string())?;
            bar.set_size(PhysicalSize::new(
                (rect.right - rect.left).max(1) as u32,
                height as u32,
            ))
            .map_err(|e| e.to_string())?;
            let state = app.state::<Shared>();
            let snapshot = state.lock();
            let pin_count = snapshot.settings.pinned.len();
            let extra = snapshot
                .running
                .iter()
                .filter(|r| {
                    !snapshot.apps.iter().any(|a| {
                        snapshot.settings.pinned.contains(&a.id)
                            && !a.executable.is_empty()
                            && a.executable.eq_ignore_ascii_case(&r.executable)
                    })
                })
                .map(|r| &r.executable)
                .collect::<std::collections::HashSet<_>>()
                .len()
                .min(6);
            let n = (pin_count + extra).min(12);
            drop(snapshot);
            let width = (((n as f64 * 62. + 158.) * scale) as u32)
                .min((work.right - work.left).max(1) as u32);
            let h = (160. * scale) as u32;
            dock.set_size(PhysicalSize::new(width, h))
                .map_err(|e| e.to_string())?;
            dock.set_position(PhysicalPosition::new(
                work.left + ((work.right - work.left) - width as i32) / 2,
                work.bottom - h as i32,
            ))
            .map_err(|e| e.to_string())?;
            native::region(hwnd(&dock)?, width as i32, h as i32, (78. * scale) as i32);
            if !app.state::<Shared>().lock().status.fullscreen {
                let _ = bar.show();
                let _ = dock.show();
            }
        }
        native::remember_appbars(handles);
        for (label, w) in app.webview_windows() {
            if let Some(index) = label
                .strip_prefix("bar-")
                .or_else(|| label.strip_prefix("dock-"))
                .or_else(|| label.strip_prefix("notch-"))
            {
                if index.parse::<usize>().unwrap_or(0) >= count {
                    let _ = w.close();
                }
            }
        }
        Ok(())
    }
    fn popup(
        app: &tauri::AppHandle,
        kind: &str,
        source: Option<&WebviewWindow>,
    ) -> Result<(), String> {
        if !["panel", "spotlight", "settings"].contains(&kind) {
            return Err("Unknown panel".into());
        }
        let win = match app.get_webview_window(kind) {
            Some(w) => w,
            None => {
                let (w, h) = match kind {
                    "panel" => (344., 438.),
                    "spotlight" => (640., 500.),
                    _ => (484., 690.),
                };
                build_window(app, kind, kind, w, h, true)?
            }
        };
        if win.is_visible().unwrap_or(false) {
            win.hide().map_err(|e| e.to_string())?;
            return Ok(());
        }
        for label in ["panel", "spotlight", "settings"] {
            if label != kind {
                if let Some(w) = app.get_webview_window(label) {
                    let _ = w.hide();
                }
            }
        }
        let monitor = source
            .and_then(|w| w.current_monitor().ok().flatten())
            .or_else(|| {
                let (x, y) = native::cursor_point();
                app.available_monitors().ok()?.into_iter().find(|m| {
                    let p = m.position();
                    let s = m.size();
                    x >= p.x && y >= p.y && x < p.x + s.width as i32 && y < p.y + s.height as i32
                })
            })
            .or_else(|| app.primary_monitor().ok().flatten())
            .ok_or("No display is available")?;
        let p = monitor.position();
        let z = monitor.size();
        let scale = monitor.scale_factor();
        let (width, height): (f64, f64) = match kind {
            "panel" => (344., 438.),
            "spotlight" => (640., 500.),
            _ => (484., 690.),
        };
        let width: f64 = width.min(z.width as f64 / scale);
        let height: f64 = height.min(z.height as f64 / scale);
        win.set_size(PhysicalSize::new(
            (width * scale) as u32,
            (height * scale) as u32,
        ))
        .map_err(|e| e.to_string())?;
        let x = if kind == "panel" {
            p.x + z.width as i32 - (width * scale) as i32 - 8
        } else {
            p.x + (z.width as i32 - (width * scale) as i32) / 2
        };
        let bar_y = source
            .filter(|s| s.label().starts_with("bar-"))
            .and_then(|s| s.outer_position().ok())
            .map(|v| v.y)
            .unwrap_or(p.y);
        let y = if kind == "panel" {
            bar_y + (36. * scale) as i32
        } else {
            p.y + ((z.height as f64 - height * scale) * 0.28) as i32
        };
        let y = y
            .min(p.y + z.height as i32 - (height * scale) as i32)
            .max(p.y);
        win.set_position(PhysicalPosition::new(x.max(p.x), y))
            .map_err(|e| e.to_string())?;
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
        if kind == "spotlight" {
            let _ = win.emit("spotlight-open", ());
        }
        if kind == "panel" {
            let a = app.clone();
            tauri::async_runtime::spawn_blocking(move || refresh_hardware(&a));
        }
        Ok(())
    }
    #[tauri::command]
    fn snapshot(state: tauri::State<Shared>, window: WebviewWindow) -> Snapshot {
        let mut s = state.lock().clone();
        if !window.label().starts_with("dock-") && window.label() != "spotlight" {
            s.apps.clear();
            s.running.clear();
        }
        s
    }
    #[tauri::command]
    fn open_popup(
        app: tauri::AppHandle,
        window: WebviewWindow,
        kind: String,
    ) -> Result<(), String> {
        popup(&app, &kind, Some(&window))
    }
    #[tauri::command]
    fn close_popup(window: WebviewWindow) -> Result<(), String> {
        if ["panel", "spotlight", "settings"].contains(&window.label()) {
            window.hide().map_err(|e| e.to_string())
        } else {
            Ok(())
        }
    }
    #[tauri::command]
    fn open_settings(page: String) -> Result<(), String> {
        native::open_settings(&page)
    }
    #[tauri::command]
    fn launch_app(state: tauri::State<Shared>, id: String) -> Result<(), String> {
        let a = state
            .lock()
            .apps
            .iter()
            .find(|a| a.id == id)
            .cloned()
            .ok_or("Application is not in the installed catalog")?;
        native::launch(&a.target, id.starts_with("aumid:"))
    }
    #[tauri::command]
    async fn refresh_apps(app: tauri::AppHandle) -> Result<(), String> {
        {
            let state = app.state::<Shared>();
            let mut s = state.lock();
            if s.catalog_loading {
                return Err("Application indexing is already in progress".into());
            }
            s.catalog_loading = true;
            s.catalog_error = None;
        }
        emit(&app);
        let result = tauri::async_runtime::spawn_blocking(read_catalog)
            .await
            .map_err(|e| e.to_string())
            .and_then(|r| r);
        let error = {
            let state = app.state::<Shared>();
            let mut s = state.lock();
            s.catalog_loading = false;
            match result {
                Ok(apps) => {
                    s.apps = apps;
                    None
                }
                Err(e) => {
                    s.catalog_error = Some(e.clone());
                    Some(e)
                }
            }
        };
        emit(&app);
        let a = app.clone();
        let _ = app.run_on_main_thread(move || {
            let _ = layout(&a);
        });
        if let Some(e) = error {
            Err(e)
        } else {
            Ok(())
        }
    }
    #[tauri::command]
    fn activate_app(state: tauri::State<Shared>, hwnd: usize) -> Result<(), String> {
        if !state.lock().running.iter().any(|r| r.hwnd == hwnd) {
            return Err("Window is no longer in the running application list".into());
        }
        native::activate(hwnd)
    }
    #[tauri::command]
    fn quit(app: tauri::AppHandle) {
        cleanup(&app);
        app.exit(0);
    }
    #[tauri::command]
    async fn set_volume(app: tauri::AppHandle, value: f32) -> Result<(), String> {
        if !value.is_finite() || !(0. ..=100.).contains(&value) {
            return Err("Volume must be between 0 and 100".into());
        }
        let (v, m) = tauri::async_runtime::spawn_blocking(move || native::volume(Some(value)))
            .await
            .map_err(|e| e.to_string())??;
        {
            let s = app.state::<Shared>();
            let mut s = s.lock();
            s.status.volume = Some(v);
            s.status.muted = m;
        }
        emit(&app);
        Ok(())
    }
    #[tauri::command]
    async fn set_brightness(app: tauri::AppHandle, value: u8) -> Result<(), String> {
        if value > 100 {
            return Err("Brightness must be between 0 and 100".into());
        }
        let script = format!(
            "& {{ {} }} -Value {}",
            include_str!("../../native-scripts/brightness.ps1"),
            value
        );
        tauri::async_runtime::spawn_blocking(move || ps(&script, &[]))
            .await
            .map_err(|e| e.to_string())??;
        app.state::<Shared>().lock().status.brightness = Some(value);
        emit(&app);
        Ok(())
    }
    #[tauri::command]
    fn save_settings(app: tauri::AppHandle, settings: Settings) -> Result<(), String> {
        settings.validate()?;
        let old = app.state::<Shared>().lock().settings.clone();
        {
            let state = app.state::<Shared>();
            let state = state.lock();
            if settings
                .pinned
                .iter()
                .any(|id| !state.apps.iter().any(|a| &a.id == id) && !old.pinned.contains(id))
            {
                return Err("Only installed applications can be pinned".into());
            }
        }
        let next: Shortcut = settings
            .shortcut
            .parse()
            .map_err(|e| format!("Invalid shortcut: {e}"))?;
        let emergency: Shortcut = EMERGENCY
            .parse()
            .map_err(|e| format!("Invalid emergency shortcut: {e}"))?;
        if next == emergency {
            return Err("The emergency shortcut cannot be reassigned".into());
        }
        let previous: Shortcut = old
            .shortcut
            .parse()
            .map_err(|e| format!("Invalid previous shortcut: {e}"))?;
        let changed = next != previous;
        if changed {
            app.global_shortcut()
                .register(next)
                .map_err(|e| format!("Shortcut unavailable: {e}"))?;
        }
        let persist = (|| {
            let p = config_path(&app)?;
            let tmp = p.with_extension("tmp");
            std::fs::write(
                &tmp,
                serde_json::to_vec_pretty(&settings).map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?;
            std::fs::rename(&tmp, &p).map_err(|e| e.to_string())
        })();
        if let Err(e) = persist {
            if changed {
                let _ = app.global_shortcut().unregister(next);
            }
            return Err(e);
        }
        if changed {
            let _ = app.global_shortcut().unregister(previous);
        }
        app.state::<Shared>().lock().settings = settings;
        layout(&app)?;
        emit(&app);
        Ok(())
    }
    #[tauri::command]
    fn set_taskbar_hidden(app: tauri::AppHandle, hidden: bool) -> Result<(), String> {
        if hidden {
            let path = journal(&app)?;
            if path.exists() {
                return Err(
                    "A taskbar recovery session is already active. Restore the taskbar first."
                        .into(),
                );
            }
            let handles: Vec<usize> = native::taskbars()
                .into_iter()
                .filter(|h| native::visible(*h))
                .collect();
            if handles.is_empty() {
                return Err("No visible Windows taskbar was found".into());
            }
            // Start the independent recovery process before changing any taskbar window.
            let ready = path.with_extension("ready");
            let _ = std::fs::remove_file(&ready);
            let exe = std::env::current_exe().map_err(|e| e.to_string())?;
            let mut guard = Command::new(exe);
            guard
                .arg("--watchdog")
                .arg(std::process::id().to_string())
                .arg(&path);
            native::hide_console_process(&mut guard);
            let mut child = guard
                .spawn()
                .map_err(|e| format!("Recovery process could not start: {e}"))?;
            let start = Instant::now();
            while !ready.exists() {
                if start.elapsed() > Duration::from_secs(3) {
                    let _ = child.kill();
                    return Err(
                        "Recovery process did not become ready; taskbar left unchanged".into(),
                    );
                }
                std::thread::sleep(Duration::from_millis(20));
            }
            std::fs::write(
                &path,
                serde_json::to_vec(&TaskbarRecovery {
                    handles: handles.clone(),
                    state: native::taskbar_state(),
                })
                .map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?;
            native::set_taskbar_state(native::taskbar_state() | 1);
            for h in handles {
                native::set_visible(h, false)
            }
            let _ = std::fs::remove_file(&ready);
            *RECOVERY_GUARD.lock().unwrap_or_else(|e| e.into_inner()) = Some(child);
        } else {
            restore(&app)
        }
        app.state::<Shared>().lock().status.taskbar_visible =
            native::taskbars().iter().any(|h| native::visible(*h));
        app.state::<Shared>().lock().status.taskbar_hidden_by_us =
            journal(&app).map(|p| p.exists()).unwrap_or(false);
        layout(&app)?;
        emit(&app);
        Ok(())
    }
    #[tauri::command]
    fn dock_interaction(
        window: WebviewWindow,
        expanded: bool,
        hidden: bool,
        hovering: bool,
    ) -> Result<(), String> {
        if !window.label().starts_with("dock-") {
            return Err("Only Dock windows can update their hit region".into());
        }
        let scale = window.scale_factor().map_err(|e| e.to_string())?;
        let size = window.outer_size().map_err(|e| e.to_string())?;
        let pos = window.outer_position().map_err(|e| e.to_string())?;
        let height = if expanded { 320. } else { 160. };
        let height = (height * scale) as u32;
        window
            .set_position(PhysicalPosition::new(
                pos.x,
                pos.y + size.height as i32 - height as i32,
            ))
            .map_err(|e| e.to_string())?;
        window
            .set_size(PhysicalSize::new(size.width, height))
            .map_err(|e| e.to_string())?;
        if expanded {
            native::focusable(hwnd(&window)?, true);
            window.set_focusable(true).map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
            native::clear_region(hwnd(&window)?)
        } else {
            window.set_focusable(false).map_err(|e| e.to_string())?;
            native::no_activate(hwnd(&window)?);
            native::region(
                hwnd(&window)?,
                size.width as i32,
                height as i32,
                if hidden {
                    height as i32 - (18. * scale) as i32
                } else if hovering {
                    0
                } else {
                    (78. * scale) as i32
                },
            );
        }
        Ok(())
    }
    #[tauri::command]
    fn notch_interaction(window: WebviewWindow, expanded: bool) -> Result<(), String> {
        if !window.label().starts_with("notch-") {
            return Err("Only notch windows can update their hit region".into());
        }
        let scale = window.scale_factor().map_err(|e| e.to_string())?;
        native::notch_region(hwnd(&window)?, scale, expanded);
        Ok(())
    }
    fn signature(app: &tauri::AppHandle) -> String {
        let m = app.available_monitors().unwrap_or_default();
        let bars: Vec<_> = native::taskbars()
            .into_iter()
            .map(|h| {
                let mut r: RECT = unsafe { std::mem::zeroed() };
                unsafe {
                    GetWindowRect(h as HWND, &mut r);
                }
                format!(
                    "{h}:{}:{},{},{},{}",
                    native::visible(h),
                    r.left,
                    r.top,
                    r.right,
                    r.bottom
                )
            })
            .collect();
        format!(
            "{:?}|{bars:?}",
            m.iter()
                .map(|m| (
                    m.position(),
                    m.size(),
                    m.scale_factor(),
                    native::work_area_key(m.position().x, m.position().y)
                ))
                .collect::<Vec<_>>()
        )
    }
    fn start_state_worker(app: tauri::AppHandle) {
        let (tx, rx) = std::sync::mpsc::sync_channel(1);
        native::start_events(tx);
        std::thread::spawn(move || {
            let mut sig = signature(&app);
            let mut last_count = 0;
            let mut last_emit = String::new();
            loop {
                let _ = rx.recv_timeout(Duration::from_secs(30));
                std::thread::sleep(Duration::from_millis(100));
                while rx.try_recv().is_ok() {}
                let running = native::running();
                let mut state = app.state::<Shared>().lock().clone();
                state.running = running;
                for r in &mut state.running {
                    r.icon = state
                        .apps
                        .iter()
                        .find(|a| a.executable.eq_ignore_ascii_case(&r.executable))
                        .and_then(|a| a.icon.clone());
                }
                native::refresh_status(&mut state.status);
                state.status.taskbar_visible =
                    native::taskbars().iter().any(|h| native::visible(*h));
                let full = state.status.fullscreen;
                let count = state.running.len();
                let encoded =
                    serde_json::to_string(&(&state.running, &state.status)).unwrap_or_default();
                {
                    let shared = app.state::<Shared>();
                    let mut current = shared.lock();
                    current.status.active_app = state.status.active_app;
                    current.status.battery = state.status.battery;
                    current.status.charging = state.status.charging;
                    current.status.fullscreen = state.status.fullscreen;
                    current.status.taskbar_visible = state.status.taskbar_visible;
                    current.status.taskbar_hidden_by_us =
                        journal(&app).map(|p| p.exists()).unwrap_or(false);
                    current.running = state.running;
                }
                let next = signature(&app);
                if next != sig || count != last_count {
                    sig = next;
                    last_count = count;
                    let a = app.clone();
                    let _ = app.run_on_main_thread(move || {
                        let _ = layout(&a);
                    });
                }
                for (label, w) in app.webview_windows() {
                    if label.starts_with("bar-") || label.starts_with("dock-") || label.starts_with("notch-") {
                        if full || (label.starts_with("notch-") && !app.state::<Shared>().lock().settings.show_notch) {
                            let _ = w.hide();
                        } else if !w.is_visible().unwrap_or(false) {
                            let _ = w.show();
                        }
                    }
                }
                if encoded != last_emit {
                    last_emit = encoded;
                    emit(&app);
                }
            }
        });
    }
    pub fn run() {
        let args: Vec<_> = std::env::args_os().collect();
        if args
            .get(1)
            .map(|s| s == "--restore-taskbar")
            .unwrap_or(false)
        {
            if let Some(dir) = std::env::var_os("APPDATA") {
                restore_journal(
                    &PathBuf::from(dir)
                        .join("me.sumitsharma.mactheme")
                        .join("taskbar-recovery.json"),
                );
            }
            return;
        }
        if args.get(1).map(|s| s == "--watchdog").unwrap_or(false) {
            if let (Some(pid), Some(path)) = (
                args.get(2)
                    .and_then(|s| s.to_string_lossy().parse::<u32>().ok()),
                args.get(3),
            ) {
                let path = PathBuf::from(path);
                let _ = std::fs::write(path.with_extension("ready"), b"ready");
                let _ = native::wait_parent(pid);
                restore_journal(&path);
                let _ = std::fs::remove_file(path.with_extension("ready"));
            }
            return;
        }
        let app = tauri::Builder::default()
            .plugin(tauri_plugin_single_instance::init(|app, _, _| {
                let _ = popup(app, "settings", None);
            }))
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                None,
            ))
            .plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(|app, s, event| {
                        if event.state == ShortcutState::Pressed {
                            let emergency: Shortcut = EMERGENCY.parse().unwrap();
                            if s == &emergency {
                                cleanup(app);
                                app.exit(0);
                            } else {
                                let _ = popup(app, "spotlight", None);
                            }
                        }
                    })
                    .build(),
            )
            .manage(Shared(Arc::new(Mutex::new(Snapshot::default()))))
            .invoke_handler(tauri::generate_handler![
                snapshot,
                open_popup,
                close_popup,
                open_settings,
                launch_app,
                refresh_apps,
                activate_app,
                quit,
                set_volume,
                set_brightness,
                save_settings,
                set_taskbar_hidden,
                dock_interaction,
                notch_interaction
            ])
            .setup(|app| {
                let handle = app.handle().clone();
                if let Ok(p) = journal(&handle) {
                    restore_journal(&p)
                }
                if let Ok(path) = config_path(&handle) {
                    if let Ok(bytes) = std::fs::read(path) {
                        if let Ok(settings) = serde_json::from_slice::<Settings>(&bytes) {
                            if settings.validate().is_ok() {
                                handle.state::<Shared>().lock().settings = settings;
                            }
                        }
                    }
                }
                {
                    let state = handle.state::<Shared>();
                    let mut s = state.lock();
                    s.running = native::running();
                    native::refresh_status(&mut s.status);
                }
                let settings = handle.state::<Shared>().lock().settings.clone();
                let shortcut: Shortcut = settings
                    .shortcut
                    .parse()
                    .map_err(|e| format!("Invalid shortcut in settings: {e}"))?;
                handle.global_shortcut().register(shortcut)?;
                handle
                    .global_shortcut()
                    .register(EMERGENCY.parse::<Shortcut>()?)?;
                let prefs =
                    MenuItem::with_id(app, "settings", "MacTheme Settings…", true, None::<&str>)?;
                let search = MenuItem::with_id(
                    app,
                    "spotlight",
                    "Search Applications…",
                    true,
                    None::<&str>,
                )?;
                let restore_item = MenuItem::with_id(
                    app,
                    "restore",
                    "Restore Windows Taskbar",
                    true,
                    None::<&str>,
                )?;
                let quit_item =
                    MenuItem::with_id(app, "quit", "Restore Taskbar & Quit", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&prefs, &search, &restore_item, &quit_item])?;
                TrayIconBuilder::new()
                    .icon(tauri::image::Image::from_bytes(include_bytes!(
                        "../icons/32x32.png"
                    ))?)
                    .tooltip("MacTheme — right-click for recovery and settings")
                    .menu(&menu)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "settings" => {
                            let _ = popup(app, "settings", None);
                        }
                        "spotlight" => {
                            let _ = popup(app, "spotlight", None);
                        }
                        "restore" => {
                            restore(app);
                            let _ = layout(app);
                            emit(app);
                        }
                        "quit" => {
                            cleanup(app);
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .build(app)?;
                layout(&handle)?;
                start_state_worker(handle.clone());
                let a = handle.clone();
                let seed_pins = config_path(&handle).map(|p| !p.exists()).unwrap_or(false);
                tauri::async_runtime::spawn_blocking(move || {
                    let result = read_catalog();
                    {
                        let state = a.state::<Shared>();
                        let mut s = state.lock();
                        match result {
                            Ok(apps) => {
                                s.apps = apps;
                                if s.settings.pinned.is_empty() && seed_pins {
                                    s.settings.pinned = s
                                        .apps
                                        .iter()
                                        .filter(|a| {
                                            ["explorer", "edge", "code", "terminal", "notepad"]
                                                .iter()
                                                .any(|n| a.name.to_lowercase().contains(n))
                                        })
                                        .take(6)
                                        .map(|a| a.id.clone())
                                        .collect();
                                }
                            }
                            Err(e) => s.catalog_error = Some(e),
                        }
                        s.catalog_loading = false;
                    }
                    emit(&a);
                    let b = a.clone();
                    let _ = a.run_on_main_thread(move || {
                        let _ = layout(&b);
                    });
                    refresh_hardware(&a);
                });
                Ok(())
            })
            .build(tauri::generate_context!())
            .expect("MacTheme failed to initialize; native taskbar has not been hidden");
        app.run(|app, event| {
            if matches!(
                event,
                tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }
            ) {
                cleanup(app);
            }
        });
    }
}
#[cfg(windows)]
fn main() {
    desktop::run();
}
