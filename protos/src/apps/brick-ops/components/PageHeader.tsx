// The header on every tab but the chat: the menu button and the screen's
// title, floating over content that fades out beneath it.

import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { useBrickOps } from "../BrickOpsContext";
import { CircleButton, TOP_FADE } from "./ui";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  const { setDrawerOpen } = useBrickOps();
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[150px]" style={{ background: TOP_FADE(105, 150) }} />
      <header className="absolute inset-x-0 top-0 z-30 flex items-center gap-3 px-4 pt-[58px]">
        <CircleButton icon={Menu} label="Menu" onClick={() => setDrawerOpen(true)} />
        <div className="min-w-0 flex-1 pr-12 text-center">
          <h1 className="truncate text-md font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-[#6ea8ff]">{subtitle}</p>}
        </div>
      </header>
    </>
  );
}
