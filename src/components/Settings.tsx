import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import {
  Monitor,
  Moon,
  Sun,
  Command,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";
import { command, native } from "../bridge";
import { type Snapshot, type Settings as Preferences } from "../types";
import { Close, Row } from "./Common";
export function Settings({
  data,
  onError,
}: {
  data: Snapshot;
  onError: (e: unknown) => void;
}) {
  const [startup, setStartup] = useState(false);
  const [shortcut, setShortcut] = useState(data.settings.shortcut);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (native) void isEnabled().then(setStartup).catch(onError);
  }, [onError]);
  useEffect(
    () => setShortcut(data.settings.shortcut),
    [data.settings.shortcut],
  );
  const save = (patch: Partial<Preferences>) =>
    void command("save_settings", {
      settings: { ...data.settings, ...patch },
    }).catch(onError);
  return (
    <main className="settings-window glass">
      <header className="settings-title">
        <span className="settings-logo">
          <Command size={25} />
        </span>
        <div>
          <h1>MacTheme</h1>
          <p>A little more at home.</p>
        </div>
        <Close />
      </header>
      <section>
        <h2>Appearance</h2>
        <div className="theme-options">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              className={data.settings.theme === t ? "chosen" : ""}
              key={t}
              onClick={() => save({ theme: t })}
            >
              {t === "light" ? <Sun /> : t === "dark" ? <Moon /> : <Monitor />}
              <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
            </button>
          ))}
        </div>
        <div className="preset-options">{([{name:'Sonoma',theme:'light',iconStyle:'glass'},{name:'Midnight',theme:'dark',iconStyle:'glass'},{name:'Graphite',theme:'dark',iconStyle:'mono'},{name:'Original',theme:'system',iconStyle:'native'}] as const).map(p=><button key={p.name} onClick={()=>save({theme:p.theme,iconStyle:p.iconStyle})}>{p.name}</button>)}</div>
        <Row end={<select aria-label="Application icon style" value={data.settings.iconStyle} onChange={e=>save({iconStyle:e.target.value as Preferences['iconStyle']})}><option value="native">Native</option><option value="glass">Glass</option><option value="mono">Monochrome</option></select>}>Application icons</Row>
        <Row end={<input type="checkbox" aria-label="Show the notch" checked={data.settings.showNotch} onChange={e=>save({showNotch:e.target.checked})}/>}>Show the notch</Row>
        <Row
          end={
            <input
              aria-label="Dock magnification"
              type="checkbox"
              checked={data.settings.magnification}
              onChange={(e) => save({ magnification: e.target.checked })}
            />
          }
        >
          Magnify Dock icons
        </Row>
        <Row
          end={
            <input
              aria-label="Automatically hide Dock"
              type="checkbox"
              checked={data.settings.autoHide}
              onChange={(e) => save({ autoHide: e.target.checked })}
            />
          }
        >
          Automatically hide Dock
        </Row>
        <Row
          end={
            <input
              aria-label="Reserve menu bar space"
              type="checkbox"
              checked={data.settings.reserveSpace}
              onChange={(e) => save({ reserveSpace: e.target.checked })}
            />
          }
        >
          Reserve space for the menu bar
        </Row>
      </section>
      <section>
        <h2>Everyday essentials</h2>
        <Row
          end={
            <button
              className="secondary-action"
              disabled={data.catalogLoading}
              onClick={() => void command("refresh_apps").catch(onError)}
            >
              {data.catalogLoading ? "Indexing…" : "Refresh"}
            </button>
          }
        >
          Installed applications
        </Row>
        <Row
          end={
            <input
              type="checkbox"
              aria-label="Launch at login"
              checked={startup}
              onChange={(e) => {
                const checked = e.target.checked;
                void (checked ? enable() : disable())
                  .then(() => setStartup(checked))
                  .catch(onError);
              }}
            />
          }
        >
          Launch at login
        </Row>
        <label className="shortcut-field">
          Spotlight shortcut
          <div>
            <input
              aria-label="Spotlight shortcut"
              value={shortcut}
              onChange={(e) => setShortcut(e.target.value)}
              spellCheck={false}
            />
            <button onClick={() => save({ shortcut })}>Save</button>
          </div>
        </label>
        <small>
          For example Alt+Space or Control+Shift+Space. Escape closes panels.
          <br />
          Emergency shortcut: Control+Alt+Shift+F12 restores the taskbar and
          quits.
        </small>
      </section>
      <section className="safety-section">
        <h2>
          <ShieldCheck size={15} /> Windows is always one step away
        </h2>
        <p>
          {!data.status.taskbarHiddenByUs
            ? "The original taskbar remains under Windows control. MacTheme is positioned inside your existing work area."
            : "The taskbar is temporarily hidden. It will be restored on quit; a separate recovery process watches for crashes."}
        </p>
        <button
          className={
            !data.status.taskbarHiddenByUs
              ? "secondary-action"
              : "primary-action"
          }
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void command("set_taskbar_hidden", {
              hidden: !data.status.taskbarHiddenByUs,
            })
              .catch(onError)
              .finally(() => setBusy(false));
          }}
        >
          {busy
            ? "Updating…"
            : !data.status.taskbarHiddenByUs
              ? "Temporarily hide Windows taskbar"
              : "Restore Windows taskbar"}
        </button>
        <button
          className="text-action"
          onClick={() =>
            void command("open_settings", { page: "taskbar" }).catch(onError)
          }
        >
          Windows taskbar settings <ExternalLink size={12} />
        </button>
      </section>
      <footer className="settings-footer">
        <span>MacTheme · 0.2.0</span>
        <button onClick={() => void command("quit").catch(onError)}>
          Restore taskbar & quit
        </button>
      </footer>
    </main>
  );
}
