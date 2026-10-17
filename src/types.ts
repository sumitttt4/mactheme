export interface AppEntry {
  id: string;
  name: string;
  target: string;
  executable: string;
  icon: string | null;
}
export interface RunningApp {
  hwnd: number;
  name: string;
  executable: string;
  icon: string | null;
  minimized: boolean;
}
export interface Status {
  activeApp: string;
  battery: number | null;
  charging: boolean;
  wifi: string;
  bluetooth: string;
  volume: number | null;
  muted: boolean;
  brightness: number | null;
  taskbarVisible: boolean;
  taskbarHiddenByUs: boolean;
  fullscreen: boolean;
}
export interface Settings {
  theme: "system" | "light" | "dark";
  iconStyle: "native" | "glass" | "mono";
  showNotch: boolean;
  pinned: string[];
  autoHide: boolean;
  magnification: boolean;
  shortcut: string;
  reserveSpace: boolean;
}
export interface Snapshot {
  apps: AppEntry[];
  running: RunningApp[];
  status: Status;
  settings: Settings;
  catalogLoading: boolean;
  catalogError: string | null;
}
export const defaults: Settings = {
  theme: "system",
  iconStyle: "glass",
  showNotch: true,
  pinned: [],
  autoHide: false,
  magnification: true,
  shortcut: "Alt+Space",
  reserveSpace: true,
};
export const empty: Snapshot = {
  apps: [],
  running: [],
  status: {
    activeApp: "Desktop",
    battery: null,
    charging: false,
    wifi: "Checking…",
    bluetooth: "Open Bluetooth settings",
    volume: null,
    muted: false,
    brightness: null,
    taskbarVisible: true,
    taskbarHiddenByUs: false,
    fullscreen: false,
  },
  settings: defaults,
  catalogLoading: true,
  catalogError: null,
};
