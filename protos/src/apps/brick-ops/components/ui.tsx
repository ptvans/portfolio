// Brick Ops' small kit. The app is dark, after Meta's Muse: black screen,
// charcoal cards with large corners, a darker well inside each card for its
// detail rows, and full-width pill buttons in pairs (grey secondary, blue to
// indigo primary).

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { AgentAvatar } from "../data";

export const CARD = "rounded-[30px] bg-[#1c1c1f] p-5";
export const WELL = "rounded-[22px] bg-[#0d0d0f]";

export function PillButton({
  children,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[52px] min-w-0 items-center justify-center rounded-full px-3 py-2 text-base font-semibold transition active:scale-[0.97] disabled:opacity-50 ${
        primary
          ? "flex-[1.35] bg-linear-to-r from-[#2563eb] to-[#5b4fe6] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]"
          : "flex-1 bg-[#3a3a3e] text-white"
      }`}
    >
      <span className="line-clamp-2 text-center leading-tight">{children}</span>
    </button>
  );
}

/** Round dark-glass control for the header (menu, more, back). */
export function CircleButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2a2a2e]/80 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_6px_18px_-6px_rgb(0_0_0/0.6)] backdrop-blur-xl transition active:scale-90"
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={2.25} />
    </button>
  );
}

/** A label/value row inside a card's well. */
export function WellRow({
  icon: Icon,
  label,
  value,
  onClick,
  trailing,
}: {
  icon: LucideIcon;
  label: ReactNode;
  value?: ReactNode;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  const body = (
    <>
      <Icon className="h-6 w-6 shrink-0 text-white/85" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 text-left text-base text-white">{label}</span>
      {value && <span className="shrink-0 text-base font-medium text-white">{value}</span>}
      {trailing}
    </>
  );
  const cls = "flex w-full items-center gap-3.5 px-4 py-3.5";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition active:bg-white/5`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function WellDivider() {
  return <div className="mx-4 h-px bg-white/10" />;
}

/** The black that hides content scrolling under a floating header: solid to
 *  `solid` px, clear by `clear` px. */
export const TOP_FADE = (solid: number, clear: number) =>
  `linear-gradient(to bottom, #000 0, #000 ${solid}px, rgb(0 0 0 / 0) ${clear}px)`;

/** The agent's avatar in its circle. Portraits fill it; art with a `crop`
 *  is zoomed in on its face. Size and ring come from `className`. */
export function AvatarImage({ avatar, className = "" }: { avatar: AgentAvatar; className?: string }) {
  return (
    <span className={`block shrink-0 overflow-hidden rounded-full bg-[#f4f4f7] ${className}`}>
      <img
        src={avatar.src}
        alt=""
        className="h-full w-full object-cover"
        style={avatar.crop ? { transform: `scale(${avatar.crop.zoom})`, transformOrigin: avatar.crop.focus } : undefined}
      />
    </span>
  );
}
