import {
  Bluetooth,
  Wifi,
  Volume2,
  Sun,
  BatteryCharging,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { useRef, useState } from "react";
import { command } from "../bridge";
import type { Status } from "../types";
import { Close } from "./Common";
function Slider({
  label,
  value,
  icon,
  onCommit,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  onCommit: (v: number) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const dirty = useRef(false);
  const generation = useRef(0);
  const commit = async (v: number) => {
    if (!dirty.current) return;
    dirty.current = false;
    const g = ++generation.current;
    setDraft(v);
    try {
      await onCommit(v);
    } finally {
      if (generation.current === g) setDraft(null);
    }
  };
  return (
    <section className="control-module slider-module">
      <label htmlFor={label}>
        {label}
        <span>{draft ?? Math.round(value)}%</span>
      </label>
      <div className="slider-wrap">
        {icon}
        <input
          id={label}
          type="range"
          min="0"
          max="100"
          value={draft ?? value}
          onChange={(e) => {
            dirty.current = true;
            generation.current++;
            setDraft(Number(e.target.value));
          }}
          onPointerUp={(e) => {
            void commit(Number(e.currentTarget.value));
          }}
          onKeyUp={(e) => {
            if (
              [
                "ArrowLeft",
                "ArrowRight",
                "Home",
                "End",
                "ArrowUp",
                "ArrowDown",
              ].includes(e.key)
            ) {
              void commit(Number(e.currentTarget.value));
            }
          }}
          onBlur={() => {
            if (draft !== null) {
              void commit(draft);
            }
          }}
        />
      </div>
    </section>
  );
}
export function ControlCenter({
  status: s,
  onError,
}: {
  status: Status;
  onError: (e: unknown) => void;
}) {
  const settings = (page: string) =>
    void command("open_settings", { page }).catch(onError);
  return (
    <main className="control-center popup glass" aria-label="Control Center">
      <header className="panel-heading">
        <span>Control Center</span>
        <Close />
      </header>
      <div className="connectivity control-module">
        <button onClick={() => settings("wifi")}>
          <span className="round-icon blue">
            <Wifi size={20} />
          </span>
          <span>
            <strong>Wi-Fi</strong>
            <small>{s.wifi}</small>
          </span>
          <ChevronRight size={14} />
        </button>
        <button onClick={() => settings("bluetooth")}>
          <span className="round-icon blue">
            <Bluetooth size={20} />
          </span>
          <span>
            <strong>Bluetooth</strong>
            <small>{s.bluetooth}</small>
          </span>
          <ChevronRight size={14} />
        </button>
      </div>
      {s.brightness !== null ? (
        <Slider
          label="Display brightness"
          value={s.brightness}
          icon={<Sun size={20} />}
          onCommit={(value) =>
            command("set_brightness", { value }).catch(onError)
          }
        />
      ) : (
        <button
          className="control-module fallback-control"
          onClick={() => settings("display")}
        >
          <Sun size={20} />
          <span>
            <strong>Display</strong>
            <small>Brightness in Windows settings</small>
          </span>
          <ChevronRight size={14} />
        </button>
      )}
      {s.volume !== null ? (
        <Slider
          label="Sound"
          value={s.volume}
          icon={<Volume2 size={20} />}
          onCommit={(value) => command("set_volume", { value }).catch(onError)}
        />
      ) : (
        <button
          className="control-module fallback-control"
          onClick={() => settings("sound")}
        >
          <Volume2 size={20} />
          <span>
            <strong>Sound</strong>
            <small>Open Windows sound settings</small>
          </span>
          <ChevronRight size={14} />
        </button>
      )}
      <footer className="control-footer">
        {s.battery !== null ? (
          <span>
            <BatteryCharging size={16} />
            {s.battery}% · {s.charging ? "Power adapter" : "Battery"}
          </span>
        ) : (
          <span>Desktop controls</span>
        )}
        <button aria-label="Windows settings" onClick={() => settings("home")}>
          <Settings2 size={17} />
        </button>
      </footer>
    </main>
  );
}
