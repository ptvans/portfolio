import { Check, LayoutGrid } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export interface SubApp {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  // Where picking the app lands: its home page.
  to: string;
}

// The dialpad: a square button left of the app's logo that opens a menu of
// the persona's sub-apps (e.g. Work, Shifts, Dispatch). Each sub-app has its
// own nav; the one in use is ticked. The menu closes on a pick, a click
// outside, or Escape.
export function AppSwitcher({ apps, activeId }: { apps: SubApp[]; activeId: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Switch app"
        title="Switch app"
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          open ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        }`}
      >
        <LayoutGrid className="h-5 w-5" strokeWidth={2} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Apps"
          className="absolute left-0 top-full z-40 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Apps</p>
          {apps.map((app) => {
            const active = app.id === activeId;
            return (
              <button
                key={app.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setOpen(false);
                  if (!active) navigate(app.to);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  active ? "bg-op-50" : "hover:bg-slate-50"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    active ? "bg-op-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <app.icon className="h-4.5 w-4.5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${active ? "text-op-700" : "text-slate-900"}`}>
                    {app.label}
                  </span>
                  <span className="block truncate text-xs text-slate-500">{app.description}</span>
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-op-600" strokeWidth={2.25} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
