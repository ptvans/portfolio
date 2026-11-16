// Shopify Polaris icons: the secondary set, for glyphs lucide-react doesn't
// have. Polaris draws filled shapes on a 20px grid with no fill or size of
// its own, so `fromPolaris` wraps one to take the same props as a lucide
// icon: sized by className or style, coloured by currentColor, strokeWidth
// accepted and ignored.
//
//   import { BookOpenIcon } from "@shopify/polaris-icons";
//   const BookOpen = fromPolaris(BookOpenIcon);
//   <BookOpen className="h-4 w-4" strokeWidth={2} />

import type { ComponentType, CSSProperties, SVGProps } from "react";

// Any icon that takes a className: lucide icons, wrapped Polaris icons and
// custom marks.
export type IconComponent = ComponentType<{ className?: string; style?: CSSProperties; strokeWidth?: number }>;

export function fromPolaris(Icon: ComponentType<SVGProps<SVGSVGElement>>): IconComponent {
  function PolarisIcon({ className, style }: { className?: string; style?: CSSProperties; strokeWidth?: number }) {
    // 24px by default, like lucide; a className or style size wins.
    return <Icon width={24} height={24} className={className} style={style} fill="currentColor" aria-hidden focusable="false" />;
  }
  PolarisIcon.displayName = `Polaris(${Icon.displayName ?? "Icon"})`;
  return PolarisIcon;
}
