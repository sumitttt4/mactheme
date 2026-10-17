import {
  Battery,
  BatteryCharging,
  Bluetooth,
  Search,
  SlidersHorizontal,
  Volume2,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { command } from "../bridge";
import type { Snapshot } from "../types";
import { SystemMark } from "./Common";
export function MenuBar({
  data,
  onError,
}: {
  data: Snapshot;
  onError: (e: unknown) => void;
}) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, 60000 - (Date.now() % 60000));
    };
    timer = setTimeout(tick, 60000 - (Date.now() % 60000));
    return () => clearTimeout(timer);
  }, []);
  const open = (kind: string) =>
    void command("open_popup", { kind }).catch(onError);
  const s = data.status;
  return (
    <header className="menu-bar glass" aria-label="Desktop menu bar">
      <nav className="menu-left">
        <button
          className="menu-button system-button"
          aria-label="System menu"
          onClick={() => open("settings")}
        >
          <SystemMark />
        </button>
        <button
          className="menu-button active-app"
          onClick={() => open("spotlight")}
        >
          {s.activeApp}
        </button>
        <button
          className="menu-button secondary-menu"
          onClick={() => open("spotlight")}
        >
          Applications
        </button>
        <button
          className="menu-button secondary-menu"
          onClick={() => open("settings")}
        >
          Settings
        </button>
      </nav>
      <nav className="menu-right">
        <button
          className="menu-button status-icon"
          title={s.wifi}
          aria-label="Wi-Fi settings"
          onClick={() => open("panel")}
        >
          <Wifi size={15} />
        </button>
        <button
          className="menu-button status-icon optional-status"
          title={s.bluetooth}
          aria-label="Bluetooth settings"
          onClick={() => open("panel")}
        >
          <Bluetooth size={14} />
        </button>
        <button
          className="menu-button status-icon optional-status"
          aria-label="Sound controls"
          onClick={() => open("panel")}
        >
          <Volume2 size={16} />
        </button>
        {s.battery !== null && (
          <button
            className="menu-button battery"
            aria-label={`Battery ${s.battery}%`}
            onClick={() => open("panel")}
          >
            <span>{s.battery}%</span>
            {s.charging ? <BatteryCharging size={20} /> : <Battery size={20} />}
          </button>
        )}
        <button
          className="menu-button status-icon"
          aria-label="Open Spotlight"
          onClick={() => open("spotlight")}
        >
          <Search size={15} />
        </button>
        <button
          className="menu-button status-icon"
          aria-label="Open Control Center"
          onClick={() => open("panel")}
        >
          <SlidersHorizontal size={16} />
        </button>
        <button
          className="menu-button clock"
          onClick={() =>
            void command("open_settings", { page: "date" }).catch(onError)
          }
        >
          {now.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
          <span>
            {now.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </button>
      </nav>
    </header>
  );
}
