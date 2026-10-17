use serde::{Deserialize, Serialize};
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppEntry {
    pub id: String,
    pub name: String,
    pub target: String,
    pub executable: String,
    pub icon: Option<String>,
}
#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RunningApp {
    pub hwnd: usize,
    pub name: String,
    pub executable: String,
    pub icon: Option<String>,
    pub minimized: bool,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub theme: String,
    pub icon_style: String,
    pub show_notch: bool,
    pub pinned: Vec<String>,
    pub auto_hide: bool,
    pub magnification: bool,
    pub shortcut: String,
    pub reserve_space: bool,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: "system".into(),
            icon_style: "glass".into(),
            show_notch: true,
            pinned: vec![],
            auto_hide: false,
            magnification: true,
            shortcut: "Alt+Space".into(),
            reserve_space: true,
        }
    }
}
impl Settings {
    pub fn validate(&self) -> Result<(), String> {
        if !["system", "light", "dark"].contains(&self.theme.as_str()) {
            return Err("Invalid theme".into());
        }
        if !["native", "glass", "mono"].contains(&self.icon_style.as_str()) {
            return Err("Invalid icon style".into());
        }
        if self.pinned.len() > 12 {
            return Err("The Dock supports up to 12 pinned applications".into());
        }
        if self.shortcut.len() > 80 || self.shortcut.is_empty() {
            return Err("Invalid shortcut".into());
        }
        if self.shortcut == "Control+Alt+Shift+F12" {
            return Err("That shortcut is reserved for emergency recovery".into());
        }
        Ok(())
    }
}
#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub active_app: String,
    pub battery: Option<u8>,
    pub charging: bool,
    pub wifi: String,
    pub bluetooth: String,
    pub volume: Option<f32>,
    pub muted: bool,
    pub brightness: Option<u8>,
    pub taskbar_visible: bool,
    pub taskbar_hidden_by_us: bool,
    pub fullscreen: bool,
}
impl Default for Status {
    fn default() -> Self {
        Self {
            active_app: "Desktop".into(),
            battery: None,
            charging: false,
            wifi: "Open Wi-Fi settings".into(),
            bluetooth: "Open Bluetooth settings".into(),
            volume: None,
            muted: false,
            brightness: None,
            taskbar_visible: true,
            taskbar_hidden_by_us: false,
            fullscreen: false,
        }
    }
}
#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub apps: Vec<AppEntry>,
    pub running: Vec<RunningApp>,
    pub settings: Settings,
    pub status: Status,
    pub catalog_loading: bool,
    pub catalog_error: Option<String>,
}
impl Default for Snapshot {
    fn default() -> Self {
        Self {
            apps: vec![],
            running: vec![],
            settings: Settings::default(),
            status: Status::default(),
            catalog_loading: true,
            catalog_error: None,
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_invalid_settings() {
        assert!(Settings {
            theme: "fake".into(),
            ..Settings::default()
        }
        .validate()
        .is_err());
        assert!(Settings {
            pinned: vec!["x".into(); 13],
            ..Settings::default()
        }
        .validate()
        .is_err());
        assert!(Settings::default().validate().is_ok());
    }
}

/// Persisted before changing Explorer visibility; consumed by an independent process.
#[derive(Serialize, Deserialize)]
pub struct TaskbarRecovery {
    pub handles: Vec<usize>,
    pub state: u32,
}
