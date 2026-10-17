import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { command, native, preview, useShell, view } from "./bridge";
import { MenuBar } from "./components/MenuBar";
import { Notch } from "./components/Notch";
import { Dock } from "./components/Dock";
import { ControlCenter } from "./components/ControlCenter";
import { Spotlight } from "./components/Spotlight";
import { Settings } from "./components/Settings";
import { ErrorNotice } from "./components/Common";
import "./styles.css";
function App() {
  const { data, error: connectionError } = useShell();
  const [error, setError] = useState<string | null>(null);
  const onError = useCallback((e: unknown) => setError(String(e)), []);
  const clear = useCallback(() => setError(null), []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") void command("close_popup").catch(onError);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onError]);
  if (!native && !preview)
    return (
      <main className="browser-warning">
        <h1>MacTheme is a desktop app.</h1>
        <p>
          Run <code>npm run tauri dev</code> on Windows 11.
        </p>
        <a href="?preview">Open the clearly labelled UI preview</a>
      </main>
    );
  return (
    <div className={`surface surface-${view} ${preview ? "preview" : ""}`}>
      {preview && view === "desktop" && (
        <div className="preview-caption">
          <span>MACTHEME / INTERFACE PREVIEW</span>
          <h1>
            Your desktop.
            <br />A little more considered.
          </h1>
          <p>
            Native Windows applications. Familiar gestures.
            <br />A quieter place to get things done.
          </p>
          <small>Browser preview · hardware controls require Windows</small>
        </div>
      )}
      {(view === "bar" || view === "desktop") && (
        <MenuBar data={data} onError={onError} />
      )}
      {(view === "dock" || view === "desktop") && (
        <Dock data={data} onError={onError} />
      )}
      {(view === "notch" || view === "desktop") && data.settings.showNotch && <Notch data={data} onError={onError}/>}
      {view === "panel" && (
        <ControlCenter status={data.status} onError={onError} />
      )}
      {view === "spotlight" && <Spotlight data={data} onError={onError} />}
      {view === "settings" && <Settings data={data} onError={onError} />}
      {(error || connectionError) && (
        <ErrorNotice
          message={error || connectionError || ""}
          onDismiss={clear}
        />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
