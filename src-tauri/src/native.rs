//! Windows integration. No Explorer injection, registry theme patches, or protected file changes.
use crate::model::{RunningApp, Status};
use std::{
    ffi::c_void,
    mem::{size_of, zeroed},
    path::Path,
    sync::{mpsc::SyncSender, Mutex, OnceLock},
};
use windows_sys::Win32::{
    Foundation::*,
    Graphics::{Dwm::*, Gdi::*},
    System::{Power::*, Threading::*},
    UI::{Accessibility::*, Shell::*, WindowsAndMessaging::*},
};
pub fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(Some(0)).collect()
}
fn string(buf: &[u16]) -> String {
    String::from_utf16_lossy(&buf[..buf.iter().position(|v| *v == 0).unwrap_or(buf.len())])
}
pub fn taskbars() -> Vec<usize> {
    unsafe {
        let mut out = Vec::new();
        let main = FindWindowW(wide("Shell_TrayWnd").as_ptr(), std::ptr::null());
        if !main.is_null() {
            out.push(main as usize);
        }
        let mut h = std::ptr::null_mut();
        loop {
            h = FindWindowExW(
                std::ptr::null_mut(),
                h,
                wide("Shell_SecondaryTrayWnd").as_ptr(),
                std::ptr::null(),
            );
            if h.is_null() {
                break;
            }
            out.push(h as usize)
        }
        out
    }
}
pub fn visible(h: usize) -> bool {
    unsafe { IsWindowVisible(h as HWND) != 0 }
}
pub fn set_visible(h: usize, show: bool) {
    unsafe {
        if IsWindow(h as HWND) != 0 {
            ShowWindow(h as HWND, if show { SW_SHOWNA } else { SW_HIDE });
        }
    }
}
pub fn hide_console_process(cmd: &mut std::process::Command) {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x08000000);
}
pub fn no_activate(h: HWND) {
    unsafe {
        let style = GetWindowLongPtrW(h, GWL_EXSTYLE);
        SetWindowLongPtrW(
            h,
            GWL_EXSTYLE,
            style | WS_EX_NOACTIVATE as isize | WS_EX_TOOLWINDOW as isize,
        );
    }
}
pub fn focusable(h: HWND, yes: bool) {
    unsafe {
        let style = GetWindowLongPtrW(h, GWL_EXSTYLE);
        SetWindowLongPtrW(
            h,
            GWL_EXSTYLE,
            if yes {
                style & !(WS_EX_NOACTIVATE as isize)
            } else {
                style | WS_EX_NOACTIVATE as isize
            },
        );
    }
}
pub fn material(h: HWND, dark: bool) {
    unsafe {
        let backdrop: i32 = 3;
        DwmSetWindowAttribute(
            h,
            DWMWA_SYSTEMBACKDROP_TYPE as u32,
            &backdrop as *const _ as *const c_void,
            4,
        );
        let enabled: i32 = dark.into();
        DwmSetWindowAttribute(
            h,
            DWMWA_USE_IMMERSIVE_DARK_MODE as u32,
            &enabled as *const _ as *const c_void,
            4,
        );
    }
}
pub fn region(h: HWND, width: i32, height: i32, top: i32) {
    unsafe {
        let r = CreateRoundRectRgn(0, top, width + 1, height + 1, 24, 24);
        if SetWindowRgn(h, r, 1) == 0 {
            DeleteObject(r);
        }
    }
}
pub fn clear_region(h: HWND) {
    unsafe {
        SetWindowRgn(h, std::ptr::null_mut(), 1);
    }
}
unsafe extern "system" fn appbar_proc(
    h: HWND,
    msg: u32,
    w: WPARAM,
    l: LPARAM,
    id: usize,
    _: usize,
) -> LRESULT {
    if msg == WM_APP + 73 {
        if let Some(tx) = NOTIFY.get() {
            let _ = tx.try_send(());
        }
    }
    if msg == WM_WINDOWPOSCHANGED {
        let mut a: APPBARDATA = zeroed();
        a.cbSize = size_of::<APPBARDATA>() as u32;
        a.hWnd = h;
        SHAppBarMessage(ABM_WINDOWPOSCHANGED, &mut a);
    }
    if msg == WM_NCDESTROY {
        remove_appbar(h);
        RemoveWindowSubclass(h, Some(appbar_proc), id);
    }
    DefSubclassProc(h, msg, w, l)
}
pub fn appbar(h: HWND, rect: RECT, reserve: bool) -> Option<RECT> {
    unsafe {
        let mut a: APPBARDATA = zeroed();
        a.cbSize = size_of::<APPBARDATA>() as u32;
        a.hWnd = h;
        SHAppBarMessage(ABM_REMOVE, &mut a);
        if !reserve {
            return None;
        }
        SetWindowSubclass(h, Some(appbar_proc), 73, 0);
        a.uCallbackMessage = WM_APP + 73;
        a.uEdge = ABE_TOP;
        a.rc = rect;
        if SHAppBarMessage(ABM_NEW, &mut a) == 0 {
            return None;
        }
        SHAppBarMessage(ABM_QUERYPOS, &mut a);
        a.rc.bottom = a.rc.top + (rect.bottom - rect.top);
        SHAppBarMessage(ABM_SETPOS, &mut a);
        Some(a.rc)
    }
}
pub fn remove_appbar(h: HWND) {
    unsafe {
        let mut a: APPBARDATA = zeroed();
        a.cbSize = size_of::<APPBARDATA>() as u32;
        a.hWnd = h;
        SHAppBarMessage(ABM_REMOVE, &mut a);
    }
}
fn executable(h: HWND) -> String {
    unsafe {
        let mut pid = 0;
        GetWindowThreadProcessId(h, &mut pid);
        let p = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if p.is_null() {
            return String::new();
        }
        let mut b = vec![0u16; 32768];
        let mut n = b.len() as u32;
        let ok = QueryFullProcessImageNameW(p, 0, b.as_mut_ptr(), &mut n);
        CloseHandle(p);
        if ok == 0 {
            String::new()
        } else {
            String::from_utf16_lossy(&b[..n as usize])
        }
    }
}
pub fn window_name(h: HWND) -> String {
    unsafe {
        let mut b = vec![0u16; 512];
        GetWindowTextW(h, b.as_mut_ptr(), 512);
        string(&b)
    }
}
fn eligible(h: HWND) -> bool {
    unsafe {
        if IsWindowVisible(h) == 0
            || !GetWindow(h, GW_OWNER).is_null()
            || GetWindowLongPtrW(h, GWL_EXSTYLE) & WS_EX_TOOLWINDOW as isize != 0
        {
            return false;
        }
        let mut cloaked = 0u32;
        DwmGetWindowAttribute(
            h,
            DWMWA_CLOAKED as u32,
            &mut cloaked as *mut _ as *mut c_void,
            4,
        );
        if cloaked != 0 {
            return false;
        }
        let mut c = [0u16; 128];
        GetClassNameW(h, c.as_mut_ptr(), 128);
        !matches!(
            string(&c).as_str(),
            "Progman" | "WorkerW" | "Shell_TrayWnd" | "Shell_SecondaryTrayWnd"
        )
    }
}
unsafe extern "system" fn enum_window(h: HWND, param: LPARAM) -> i32 {
    let out = &mut *(param as *mut Vec<RunningApp>);
    if !eligible(h) {
        return 1;
    }
    let mut pid = 0;
    GetWindowThreadProcessId(h, &mut pid);
    if pid == GetCurrentProcessId() {
        return 1;
    }
    let title = window_name(h);
    if title.is_empty() {
        return 1;
    }
    let exe = executable(h);
    if exe.is_empty() {
        return 1;
    }
    let name = Path::new(&exe)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or(title);
    out.push(RunningApp {
        hwnd: h as usize,
        name,
        executable: exe,
        icon: None,
        minimized: IsIconic(h) != 0,
    });
    1
}
pub fn running() -> Vec<RunningApp> {
    let mut out = Vec::new();
    unsafe {
        EnumWindows(Some(enum_window), &mut out as *mut _ as isize);
    }
    out
}
pub fn activate(hwnd: usize) -> Result<(), String> {
    unsafe {
        let h = hwnd as HWND;
        if !eligible(h) {
            return Err("This application window is no longer available".into());
        }
        if GetForegroundWindow() == h {
            ShowWindow(h, SW_MINIMIZE);
            return Ok(());
        }
        if IsIconic(h) != 0 {
            ShowWindow(h, SW_RESTORE);
        }
        if SetForegroundWindow(h) == 0 {
            let mut f: FLASHWINFO = zeroed();
            f.cbSize = size_of::<FLASHWINFO>() as u32;
            f.hwnd = h;
            f.dwFlags = FLASHW_TRAY;
            f.uCount = 2;
            FlashWindowEx(&f);
            return Err(
                "Windows prevented focus switching. The application is highlighted in the taskbar."
                    .into(),
            );
        }
        Ok(())
    }
}
pub fn launch(target: &str, uwp: bool) -> Result<(), String> {
    unsafe {
        let t = if uwp {
            format!("shell:AppsFolder\\{target}")
        } else {
            target.into()
        };
        let code = ShellExecuteW(
            std::ptr::null_mut(),
            wide("open").as_ptr(),
            wide(&t).as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        );
        if code as isize <= 32 {
            Err(format!(
                "Windows could not open this application ({})",
                code as isize
            ))
        } else {
            Ok(())
        }
    }
}
pub fn open_settings(page: &str) -> Result<(), String> {
    let uri = match page {
        "home" => "ms-settings:",
        "wifi" => "ms-settings:network-wifi",
        "bluetooth" => "ms-settings:bluetooth",
        "sound" => "ms-settings:sound",
        "display" => "ms-settings:display",
        "taskbar" => "ms-settings:taskbar",
        "date" => "ms-settings:dateandtime",
        _ => return Err("Unknown Windows settings page".into()),
    };
    launch(uri, false)
}
pub fn refresh_status(s: &mut Status) {
    unsafe {
        let mut p: SYSTEM_POWER_STATUS = zeroed();
        if GetSystemPowerStatus(&mut p) != 0 {
            s.battery = if p.BatteryFlag == 128 || p.BatteryLifePercent == 255 {
                None
            } else {
                Some(p.BatteryLifePercent)
            };
            s.charging = p.ACLineStatus == 1;
        }
        let h = GetForegroundWindow();
        if !h.is_null() {
            let exe = executable(h);
            let own = std::env::current_exe().ok();
            if own
                .as_ref()
                .map(|p| p.to_string_lossy().eq_ignore_ascii_case(&exe))
                .unwrap_or(false)
            {
                return;
            }
            s.active_app = Path::new(&exe)
                .file_stem()
                .map(|p| p.to_string_lossy().to_string())
                .filter(|x| !x.is_empty())
                .unwrap_or_else(|| "Desktop".into());
            let mut c = [0u16; 128];
            GetClassNameW(h, c.as_mut_ptr(), 128);
            let desktop = matches!(
                string(&c).as_str(),
                "Progman" | "WorkerW" | "Shell_TrayWnd" | "Shell_SecondaryTrayWnd"
            );
            let m = MonitorFromWindow(h, MONITOR_DEFAULTTONEAREST);
            let mut info: MONITORINFO = zeroed();
            info.cbSize = size_of::<MONITORINFO>() as u32;
            let mut r: RECT = zeroed();
            let mut frame: RECT = zeroed();
            GetWindowRect(h, &mut r);
            if DwmGetWindowAttribute(
                h,
                DWMWA_EXTENDED_FRAME_BOUNDS as u32,
                &mut frame as *mut _ as *mut c_void,
                size_of::<RECT>() as u32,
            ) == 0
            {
                r = frame;
            }
            s.fullscreen = !desktop
                && GetMonitorInfoW(m, &mut info) != 0
                && r.left <= info.rcMonitor.left
                && r.top <= info.rcMonitor.top
                && r.right >= info.rcMonitor.right
                && r.bottom >= info.rcMonitor.bottom;
        }
    }
}
struct ComGuard;
impl Drop for ComGuard {
    fn drop(&mut self) {
        unsafe { windows::Win32::System::Com::CoUninitialize() }
    }
}
pub fn volume(set: Option<f32>) -> Result<(f32, bool), String> {
    use windows::Win32::{
        Media::Audio::{Endpoints::*, *},
        System::Com::*,
    };
    unsafe {
        CoInitializeEx(None, COINIT_MULTITHREADED)
            .ok()
            .map_err(|e| e.to_string())?;
        let _guard = ComGuard;
        let e: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(|e| e.to_string())?;
        let device = e
            .GetDefaultAudioEndpoint(eRender, eConsole)
            .map_err(|e| e.to_string())?;
        let endpoint: IAudioEndpointVolume = device
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| e.to_string())?;
        if let Some(v) = set {
            endpoint
                .SetMasterVolumeLevelScalar(v / 100., std::ptr::null())
                .map_err(|e| e.to_string())?;
            endpoint
                .SetMute(false, std::ptr::null())
                .map_err(|e| e.to_string())?;
        }
        Ok((
            endpoint
                .GetMasterVolumeLevelScalar()
                .map_err(|e| e.to_string())?
                * 100.,
            endpoint.GetMute().map_err(|e| e.to_string())?.as_bool(),
        ))
    }
}
static NOTIFY: OnceLock<SyncSender<()>> = OnceLock::new();
unsafe extern "system" fn hook(
    _: HWINEVENTHOOK,
    event: u32,
    h: HWND,
    object: i32,
    _: i32,
    _: u32,
    _: u32,
) {
    if event == EVENT_OBJECT_LOCATIONCHANGE && (h != GetForegroundWindow() || object != 0) {
        return;
    }
    if matches!(event, EVENT_OBJECT_SHOW | EVENT_OBJECT_HIDE) && object != 0 {
        return;
    }
    if let Some(tx) = NOTIFY.get() {
        let _ = tx.try_send(());
    }
}
static APPBAR_HANDLES: Mutex<Vec<usize>> = Mutex::new(Vec::new());
pub fn remember_appbars(handles: Vec<usize>) {
    *APPBAR_HANDLES.lock().unwrap_or_else(|e| e.into_inner()) = handles;
}
pub fn cleanup_appbars() {
    for h in APPBAR_HANDLES
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .drain(..)
    {
        remove_appbar(h as HWND);
    }
}
unsafe extern "system" fn events_proc(hwnd: HWND, msg: u32, w: WPARAM, l: LPARAM) -> LRESULT {
    if matches!(
        msg,
        WM_DISPLAYCHANGE | WM_DEVICECHANGE | WM_POWERBROADCAST | WM_SETTINGCHANGE
    ) {
        if let Some(tx) = NOTIFY.get() {
            let _ = tx.try_send(());
        }
    }
    DefWindowProcW(hwnd, msg, w, l)
}
pub fn start_events(tx: SyncSender<()>) {
    let _ = NOTIFY.set(tx);
    std::thread::spawn(|| unsafe {
        let instance =
            windows_sys::Win32::System::LibraryLoader::GetModuleHandleW(std::ptr::null());
        let class = wide("MacThemeEvents");
        let mut wc: WNDCLASSW = zeroed();
        wc.lpfnWndProc = Some(events_proc);
        wc.hInstance = instance;
        wc.lpszClassName = class.as_ptr();
        RegisterClassW(&wc);
        let window = CreateWindowExW(
            0,
            class.as_ptr(),
            class.as_ptr(),
            WS_OVERLAPPED,
            0,
            0,
            0,
            0,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            instance,
            std::ptr::null(),
        );
        let hooks = [
            SetWinEventHook(
                EVENT_SYSTEM_FOREGROUND,
                EVENT_SYSTEM_FOREGROUND,
                std::ptr::null_mut(),
                Some(hook),
                0,
                0,
                WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS,
            ),
            SetWinEventHook(
                EVENT_OBJECT_SHOW,
                EVENT_OBJECT_HIDE,
                std::ptr::null_mut(),
                Some(hook),
                0,
                0,
                WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS,
            ),
            SetWinEventHook(
                EVENT_OBJECT_LOCATIONCHANGE,
                EVENT_OBJECT_LOCATIONCHANGE,
                std::ptr::null_mut(),
                Some(hook),
                0,
                0,
                WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS,
            ),
            SetWinEventHook(
                EVENT_SYSTEM_MINIMIZESTART,
                EVENT_SYSTEM_MINIMIZEEND,
                std::ptr::null_mut(),
                Some(hook),
                0,
                0,
                WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS,
            ),
        ];
        let mut msg: MSG = zeroed();
        while GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
        for h in hooks {
            if !h.is_null() {
                UnhookWinEvent(h);
            }
        }
        DestroyWindow(window);
    });
}
pub fn wait_parent(pid: u32) -> Result<(), String> {
    unsafe {
        let h = OpenProcess(0x00100000, 0, pid);
        if h.is_null() {
            return Ok(());
        }
        WaitForSingleObject(h, INFINITE);
        CloseHandle(h);
        Ok(())
    }
}

pub fn taskbar_state() -> u32 {
    unsafe {
        let mut a: APPBARDATA = zeroed();
        a.cbSize = size_of::<APPBARDATA>() as u32;
        SHAppBarMessage(ABM_GETSTATE, &mut a) as u32
    }
}
pub fn set_taskbar_state(state: u32) {
    unsafe {
        let mut a: APPBARDATA = zeroed();
        a.cbSize = size_of::<APPBARDATA>() as u32;
        a.lParam = state as isize;
        SHAppBarMessage(ABM_SETSTATE, &mut a);
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn wide_strings_are_nul_terminated_and_preserve_unicode() {
        let w = wide("日本語 🖥");
        assert_eq!(w.last(), Some(&0));
        assert_eq!(String::from_utf16_lossy(&w[..w.len() - 1]), "日本語 🖥");
    }
}

pub fn work_area_key(x: i32, y: i32) -> (i32, i32, i32, i32) {
    unsafe {
        let m = MonitorFromPoint(POINT { x: x + 1, y: y + 1 }, MONITOR_DEFAULTTONEAREST);
        let mut info: MONITORINFO = zeroed();
        info.cbSize = size_of::<MONITORINFO>() as u32;
        GetMonitorInfoW(m, &mut info);
        let r = info.rcWork;
        (r.left, r.top, r.right, r.bottom)
    }
}

pub fn cursor_point() -> (i32, i32) {
    unsafe {
        let mut p: POINT = zeroed();
        GetCursorPos(&mut p);
        (p.x, p.y)
    }
}


pub fn notch_region(h: HWND, scale: f64, expanded: bool) {
    unsafe {
        let width = (360. * scale) as i32;
        let visible_width = ((if expanded { 360. } else { 170. }) * scale) as i32;
        let height = ((if expanded { 168. } else { 44. }) * scale) as i32;
        let region = CreateRectRgn((width - visible_width) / 2, 0, (width + visible_width) / 2, height);
        if SetWindowRgn(h, region, 1) == 0 { DeleteObject(region); }
    }
}
