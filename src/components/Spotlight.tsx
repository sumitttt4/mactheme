import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Search,
  Pin,
  PinOff,
} from "lucide-react";
import { command, native } from "../bridge";
import { listen } from "@tauri-apps/api/event";
import { searchApps } from "../search";
import type { Snapshot } from "../types";
import { AppIcon } from "./Common";
export function Spotlight({
  data,
  onError,
}: {
  data: Snapshot;
  onError: (e: unknown) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const result = useMemo(
    () => searchApps(data.apps, query),
    [data.apps, query],
  );
  useEffect(() => {
    input.current?.focus();
    if (!native) return;
    let active = true;
    let off: (() => void) | undefined;
    void listen("spotlight-open", () => {
      setQuery("");
      setSelected(0);
      input.current?.focus();
    }).then((fn) => {
      if (active) off = fn;
      else fn();
    });
    return () => {
      active = false;
      off?.();
    };
  }, []);
  useEffect(() => {
    document
      .getElementById(`result-${selected}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  const launch = () => {
    if (result[selected])
      void command("launch_app", { id: result[selected].id })
        .then(() => command("close_popup"))
        .catch(onError);
  };
  const a = result[selected];
  return (
    <main
      className="spotlight glass"
      aria-label="Spotlight search"
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelected((v) => Math.min(v + 1, result.length - 1));
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelected((v) => Math.max(0, v - 1));
        }
        if (e.key === "Enter") {
          e.preventDefault();
          launch();
        }
      }}
    >
      <div className="spotlight-input">
        <Search size={26} strokeWidth={1.5} />
        <input
          ref={input}
          autoFocus
          role="combobox"
          aria-label="Search applications"
          aria-expanded="true"
          aria-controls="search-results"
          aria-activedescendant={a ? `result-${selected}` : undefined}
          placeholder="Search applications"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
        />
        <kbd>esc</kbd>
      </div>
      <div className="search-meta">
        {query ? "Applications" : "Your applications"}
        <span>
          {data.catalogLoading ? "Indexing…" : `${result.length} results`}
        </span>
      </div>
      <div id="search-results" role="listbox" className="search-results">
        {result.map((app, i) => (
          <div
            role="option"
            aria-selected={selected === i}
            className={`search-result ${selected === i ? "selected" : ""}`}
            id={`result-${i}`}
            key={app.id}
            onPointerMove={() => setSelected(i)}
          >
            <button
              className="result-main"
              tabIndex={-1}
              onClick={() =>
                void command("launch_app", { id: app.id })
                  .then(() => command("close_popup"))
                  .catch(onError)
              }
            >
              <AppIcon icon={app.icon} name={app.name} />
              <span>
                {app.name}
                <small>Application</small>
              </span>
            </button>
            <button
              className="pin-action"
              aria-label={`${data.settings.pinned.includes(app.id) ? "Unpin" : "Pin"} ${app.name}`}
              onClick={() =>
                void command("save_settings", {
                  settings: {
                    ...data.settings,
                    pinned: data.settings.pinned.includes(app.id)
                      ? data.settings.pinned.filter((id) => id !== app.id)
                      : [...data.settings.pinned, app.id],
                  },
                }).catch(onError)
              }
            >
              {data.settings.pinned.includes(app.id) ? (
                <PinOff size={15} />
              ) : (
                <Pin size={15} />
              )}
            </button>
          </div>
        ))}
        {!result.length && (
          <p className="empty-state">
            {data.catalogLoading
              ? "Finding your installed applications…"
              : data.catalogError || "No applications found. Try another name."}
          </p>
        )}
      </div>
      <footer className="spotlight-footer">
        <span>
          <ArrowUp size={12} />
          <ArrowDown size={12} /> Navigate
        </span>
        <span>
          <CornerDownLeft size={13} /> Open application
        </span>
      </footer>
    </main>
  );
}
