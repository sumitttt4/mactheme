import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { empty, type Snapshot, type Settings } from "./types";
export const native = "__TAURI_INTERNALS__" in window;
export const preview =
  !native && new URLSearchParams(location.search).has("preview");
export const view =
  new URLSearchParams(location.search).get("view") || "desktop";
let fixture: Snapshot = {
  ...empty,
  catalogLoading: false,
  status: {
    ...empty.status,
    activeApp: "File Explorer",
    wifi: "Wi-Fi settings",
    bluetooth: "Bluetooth settings",
    taskbarVisible: true,
  },
  apps: [
    "File Explorer",
    "Microsoft Edge",
    "Visual Studio Code",
    "Terminal",
    "Settings",
    "Notepad",
  ].map((name, i) => ({
    id: `fixture-${i}`,
    name,
    target: "",
    executable: "",
    icon: null,
  })),
};
fixture.settings = {
  ...fixture.settings,
  pinned: fixture.apps.slice(0, 4).map((a) => a.id),
};
export async function command<T = void>(
  name: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (native) return invoke<T>(name, args);
  if (preview) {
    if (name === "snapshot") return fixture as T;
    if (name === "save_settings") {
      fixture = { ...fixture, settings: args?.settings as Settings };
      window.dispatchEvent(new Event("preview-state"));
      return undefined as T;
    }
    if (name === "dock_interaction" || name === "notch_interaction") return undefined as T;
    if (name === "close_popup") return undefined as T;
    throw new Error(
      "Windows integration is unavailable in the browser preview.",
    );
  }
  throw new Error("Run MacTheme as a Windows desktop application.");
}
export function useShell() {
  const [data, setData] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let off: (() => void) | undefined;
    const update = (s: Snapshot) => {
      if (active) setData(s);
    };
    async function setup() {
      try {
        if (native)
          off = await listen<Snapshot>("shell-state", (e) => update(e.payload));
        if (!active) {
          off?.();
          return;
        }
        update(await command<Snapshot>("snapshot"));
      } catch (e) {
        if (active) setError(String(e));
      }
    }
    void setup();
    const refresh = () => void command<Snapshot>("snapshot").then(update);
    window.addEventListener("preview-state", refresh);
    return () => {
      active = false;
      off?.();
      window.removeEventListener("preview-state", refresh);
    };
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        data.settings.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : data.settings.theme);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [data.settings.theme]);
  return { data, error };
}
