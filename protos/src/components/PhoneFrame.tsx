import type { ReactNode } from "react";

// Wraps mobile prototype screens in a phone-shaped viewport so it reads as
// mobile-first even when viewed on a desktop browser. Everything the prototype
// needs now lives inside the device (see the Emulator tab), so there is no
// canvas chrome around it. The screen is scaled up by the `phone-viewport`
// class (see --ui-scale in src/index.css). The 860px height is deliberately
// short of a full phone: on mobile Safari the bottom toolbar covers the page's
// lowest ~60px, so a taller frame would hide the floating tab bar.
//
// The screen carries the iOS 26 wallpaper (.ios-wallpaper) that the Liquid
// Glass surfaces sit over, plus a status bar and home indicator drawn on top so
// the glass reads against a real-looking device.
export function PhoneFrame({
  children,
  statusBarTone = "dark",
}: {
  children: ReactNode;
  /** "light" for screens with a dark top edge (the sign-in splash). */
  statusBarTone?: "dark" | "light";
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-900 py-8">
      <div className="relative flex h-[860px] w-[405px] flex-col overflow-hidden rounded-[3.4rem] border-[6px] border-slate-950 bg-slate-950 shadow-2xl ring-1 ring-slate-700/60">
        <StatusBar tone={statusBarTone} />
        <div className="pointer-events-none absolute left-1/2 top-[11px] z-30 h-[34px] w-[122px] -translate-x-1/2 rounded-full bg-black" />
        <div
          className={`pointer-events-none absolute bottom-2 left-1/2 z-30 h-[5px] w-[134px] -translate-x-1/2 rounded-full ${
            statusBarTone === "light" ? "bg-white/85" : "bg-slate-900/85"
          }`}
        />
        {/* `isolate` keeps the screen's own z-indexes (sticky headers, the toast)
            in their own stacking context. Without it they share one with the
            camera island above and, being later in the DOM, paint over it. */}
        <div className="phone-viewport ios-wallpaper isolate flex-1 overflow-y-auto rounded-[2.9rem]">
          {children}
        </div>
      </div>
    </div>
  );
}

// Time on the left, signal / wifi / battery on the right, either side of the
// camera island. Fixed px sizes: it is device chrome, not app type, so it does
// not follow the phone viewport's --ui-scale.
function StatusBar({ tone }: { tone: "dark" | "light" }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 z-30 flex h-[50px] items-center justify-between px-9 pt-1 ${
        tone === "light" ? "text-white" : "text-slate-900"
      }`}>
      <span className="w-[54px] text-center text-[16px] font-semibold tracking-tight">9:41</span>
      <span className="flex items-center gap-[6px]">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden>
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden>
          <path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.3-1.3A10.6 10.6 0 0 0 8 .4 10.6 10.6 0 0 0 .5 3.4l1.3 1.3A8.8 8.8 0 0 1 8 2.2Z" />
          <path d="M8 5.6c1.5 0 2.8.6 3.8 1.5l1.3-1.3A7.2 7.2 0 0 0 8 3.8c-2 0-3.8.8-5.1 2l1.3 1.3c1-.9 2.3-1.5 3.8-1.5Z" />
          <path d="M8 9.2c.6 0 1.1.2 1.5.6L8 11.6 6.5 9.8c.4-.4.9-.6 1.5-.6Z" />
        </svg>
        <span className="flex items-center gap-[1px]">
          <span className="flex h-[13px] w-[25px] items-center rounded-[4px] border border-current/40 p-[1.5px]">
            <span className="h-full w-[78%] rounded-[2px] bg-current" />
          </span>
          <span className="h-[4px] w-[1.5px] rounded-r-sm bg-current/40" />
        </span>
      </span>
    </div>
  );
}
