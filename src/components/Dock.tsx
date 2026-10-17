import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  Settings2,
  Pin,
  PinOff,
  ExternalLink,
  Minus,
} from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { command, native } from "../bridge";
import { dockEntries } from "../search";
import type { AppEntry, RunningApp, Snapshot } from "../types";
import { AppIcon } from "./Common";
const SIZE = 48,
  GAP = 14;
function DockItem({
  item,
  index,
  mouseX,
  running,
  magnify,
  onContext,
  onLaunch,
  iconStyle,
}: {
  item: AppEntry;
  iconStyle: "native" | "glass" | "mono";
  index: number;
  mouseX: MotionValue<number>;
  running?: RunningApp;
  magnify: boolean;
  onContext: (app: AppEntry) => void;
  onLaunch: () => void;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const distance = useTransform(
    mouseX,
    (x) => x - (index * (SIZE + GAP) + SIZE / 2 + 18),
  );
  const target = useTransform(distance, [-145, 0, 145], [1, 1.65, 1]);
  const scale = useSpring(target, { mass: 0.18, stiffness: 420, damping: 22 });
  // Fixed slots + compositor transforms avoid pointer-driven React renders and layout work.
  const transform = useTransform([scale, distance], ([v, d]) => {
    const s = magnify && !reduce ? Number(v) : 1;
    const shift =
      magnify && !reduce
        ? Math.sign(Number(d)) *
          -Math.max(0, 1 - Math.abs(Number(d)) / 200) *
          12
        : 0;
    return `translateX(${shift}px) scale(${s})`;
  });
  return (
    <div className="dock-slot">
      <motion.button
        ref={ref}
        style={{ transform, transformOrigin: "50% 100%" }}
        className="dock-app"
        aria-label={`${item.name}${running ? " (running)" : ""}`}
        onClick={onLaunch}
        onContextMenu={(e) => {
          e.preventDefault();
          onContext(item);
        }}
      >
        <AppIcon icon={item.icon || running?.icon || null} name={item.name} style={iconStyle} />
      </motion.button>
      <span className="dock-tooltip">{item.name}</span>
      {running && <span className="running-dot" />}
    </div>
  );
}
export function Dock({
  data,
  onError,
}: {
  data: Snapshot;
  onError: (e: unknown) => void;
}) {
  const mouseX = useMotionValue(Infinity);
  const reduceMotion = useReducedMotion();
  const [menu, setMenu] = useState<AppEntry | null>(null);
  const [over, setOver] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  useEffect(() => {
    const resize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    void command("dock_interaction", {
      expanded: !!menu,
      hovering: over,
      hidden: data.settings.autoHide && !over && !menu,
    })
      .then(() => {
        if (menu)
          document
            .querySelector<HTMLButtonElement>(".dock-context button")
            ?.focus();
      })
      .catch(onError);
  }, [menu, over, data.settings.autoHide, onError]);
  useEffect(() => {
    if (!native) return;
    let active = true;
    let off: (() => void) | undefined;
    void listen("dock-menu-close", () => setMenu(null)).then((fn) => {
      if (active) off = fn;
      else fn();
    });
    return () => {
      active = false;
      off?.();
    };
  }, []);
  const pinned = dockEntries(data.apps, data.settings.pinned);
  const extras = data.running
    .filter(
      (r) =>
        !pinned.some(
          (a) =>
            a.executable &&
            a.executable.toLowerCase() === r.executable.toLowerCase(),
        ),
    )
    .filter(
      (r, i, all) => all.findIndex((a) => a.executable === r.executable) === i,
    )
    .slice(0, 6)
    .map((r) => ({
      id: `running:${r.hwnd}`,
      name: r.name,
      target: "",
      executable: r.executable,
      icon: r.icon,
    }));
  const capacity = Math.max(
    0,
    Math.min(12, Math.floor((viewportWidth - 158) / 62)),
  );
  const items = [...pinned, ...extras].slice(0, capacity);
  const findRunning = (app: AppEntry) =>
    data.running.find(
      (r) =>
        app.id === `running:${r.hwnd}` ||
        (!!app.executable &&
          r.executable.toLowerCase() === app.executable.toLowerCase()),
    );
  const launch = (a: AppEntry) => {
    const r = findRunning(a);
    setMenu(null);
    void command(
      r ? "activate_app" : "launch_app",
      r ? { hwnd: r.hwnd } : { id: a.id },
    ).catch(onError);
  };
  const togglePin = async () => {
    if (!menu) return;
    const pins = data.settings.pinned;
    await command("save_settings", {
      settings: {
        ...data.settings,
        pinned: pins.includes(menu.id)
          ? pins.filter((id) => id !== menu.id)
          : [...pins, menu.id],
      },
    });
    setMenu(null);
  };
  return (
    <div
      className={`dock-region ${data.settings.autoHide && !over && !menu ? "is-hidden" : ""}`}
      onPointerEnter={() => setOver(true)}
      onPointerLeave={() => {
        setOver(false);
        mouseX.set(Infinity);
      }}
    >
      {menu && (
        <div
          className="dock-context glass"
          role="menu"
          onKeyDown={(e) => {
            if (e.key === "Escape") setMenu(null);
          }}
        >
          <strong>{menu.name}</strong>
          <button role="menuitem" onClick={() => launch(menu)}>
            <ExternalLink size={14} />
            {findRunning(menu) ? "Activate / minimize" : "Open"}
          </button>
          {!menu.id.startsWith("running:") && (
            <button
              role="menuitem"
              onClick={() => void togglePin().catch(onError)}
            >
              {data.settings.pinned.includes(menu.id) ? (
                <PinOff size={14} />
              ) : (
                <Pin size={14} />
              )}{" "}
              {data.settings.pinned.includes(menu.id)
                ? "Remove from Dock"
                : "Keep in Dock"}
            </button>
          )}
          <button role="menuitem" onClick={() => setMenu(null)}>
            <Minus size={14} />
            Dismiss
          </button>
        </div>
      )}
      <div
        className="dock glass"
        role="toolbar"
        aria-label="Application dock"
        onPointerMove={(e) => {
          if (
            e.pointerType === "mouse" &&
            data.settings.magnification &&
            !reduceMotion &&
            matchMedia("(hover: hover) and (pointer: fine)").matches
          )
            mouseX.set(
              e.clientX - e.currentTarget.getBoundingClientRect().left,
            );
        }}
        onPointerLeave={() => mouseX.set(Infinity)}
      >
        {items.map((a, i) => (
          <DockItem
            key={a.id}
            item={a}
            index={i}
            mouseX={mouseX}
            running={findRunning(a)}
            iconStyle={data.settings.iconStyle}
            magnify={data.settings.magnification}
            onContext={setMenu}
            onLaunch={() => launch(a)}
          />
        ))}
        <span className="dock-divider" />
        <button
          className="dock-utility"
          aria-label="Search applications"
          onClick={() =>
            void command("open_popup", { kind: "spotlight" }).catch(onError)
          }
        >
          <Search size={25} />
          <span className="dock-tooltip">Applications</span>
        </button>
        <button
          className="dock-utility"
          aria-label="MacTheme settings"
          onClick={() =>
            void command("open_popup", { kind: "settings" }).catch(onError)
          }
        >
          <Settings2 size={25} />
          <span className="dock-tooltip">Settings</span>
        </button>
      </div>
    </div>
  );
}
