import { AppGlyph } from "../../shared/AppGlyph";
import { AppWindow, X, Command } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { command } from "../bridge";
export function AppIcon({icon,name,style="native"}:{icon:string|null;name:string;style?:"native"|"glass"|"mono"}) {
 return <span className={`desktop-app-icon icon-${style}`}>{icon?<img draggable={false} src={icon} alt=""/>:<AppGlyph name={name}/>}</span>;
}
export function SystemMark() {
  return (
    <span className="system-mark" aria-hidden="true">
      <Command size={17} strokeWidth={2.6} />
    </span>
  );
}
export function Close({ label = "Close" }: { label?: string }) {
  return (
    <button
      className="close"
      aria-label={label}
      onClick={() => void command("close_popup").catch(console.error)}
    >
      <X size={14} />
    </button>
  );
}
export function ErrorNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);
  return (
    <div className="error-notice" role="alert">
      <span>{message}</span>
      <button aria-label="Dismiss error" onClick={onDismiss}>
        <X size={14} />
      </button>
    </div>
  );
}
export function useAction() {
  const [error, setError] = useState<string | null>(null);
  return {
    error,
    clear: () => setError(null),
    run: async (action: () => Promise<unknown>) => {
      try {
        await action();
      } catch (e) {
        setError(String(e));
      }
    },
  };
}
export function Row({
  children,
  end,
}: {
  children: ReactNode;
  end?: ReactNode;
}) {
  return (
    <div className="setting-row">
      <span>{children}</span>
      {end}
    </div>
  );
}
