// Sol's mark: the iridescent orb that stands for the agent everywhere it
// appears (nav, chat, SOP steps). Three bitmaps, picked so each stays sharp at 2x:
// 32px (up to 16px icons), 48px (up to 24px), 144px (chat avatars). The files
// carry no shadow; the drop shadow is added in CSS (.sol-icon).
//
// `thinking` swaps the orb for the animated loader while Sol is
// working.
// Size comes from `size` (px) or, when omitted, from `className` (h-4 w-4 …),
// which lets it stand in anywhere a lucide icon is used.

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import thinkingLoader from "../../../../assets/dots-loader.lottie?url";
import smSrc from "../../../../assets/sol-avatar-sm.png";
import lgSrc from "../../../../assets/sol-avatar-lg.png";
import xlSrc from "../../../../assets/sol-avatar-xl.png";

// How much bigger the loader renders than the orb it stands in for.
const LOTTIE_SCALE = 1.4;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function SolIcon({
  size,
  thinking = false,
  className = "",
}: {
  size?: number;
  thinking?: boolean;
  className?: string;
  // Accepted so the icon is a drop-in for a lucide icon in nav items.
  strokeWidth?: number;
}) {
  if (thinking) {
    // The player sizes its canvas from its container, so the box is fixed here.
    // The artwork sits inside padding, so the box is drawn larger
    // than the orb and pulled back with a negative margin to keep the layout.
    const box = size ? Math.round(size * LOTTIE_SCALE) : undefined;
    const pull = size && box ? -(box - size) / 2 : undefined;
    return (
      <span
        aria-hidden
        className={`inline-block shrink-0 overflow-hidden ${className}`}
        style={box ? { width: box, height: box, margin: pull } : undefined}
      >
        <DotLottieReact src={thinkingLoader} loop autoplay={!prefersReducedMotion()} style={{ width: "100%", height: "100%" }} />
      </span>
    );
  }

  return (
    <img
      src={!size || size <= 16 ? smSrc : size <= 24 ? lgSrc : xlSrc}
      alt=""
      aria-hidden
      draggable={false}
      width={size}
      height={size}
      style={size ? { width: size, height: size } : undefined}
      className={`sol-icon inline-block shrink-0 select-none rounded-full object-contain ${size && size > 32 ? "sol-icon--xl" : ""} ${className}`}
    />
  );
}
