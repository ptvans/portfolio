// The bar across the top of the three full-window SOP views: the definition,
// a run instance, and the aggregate analysis. They sit outside the sidebar
// shell, so this is the only way back to the app.

import { CircleHelp } from "lucide-react";
import { Link } from "react-router-dom";
import logoMark from "../../../../assets/logo-mark.svg";

const USER_EMAIL = "thom@getthom.com";

export function SopTopBar() {
  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <Link to="/internal-ops" className="flex items-center gap-2">
        <img src={logoMark} alt="" className="h-5 w-5" />
        <span className="text-sm font-bold tracking-wide text-brand-900">BUILD</span>
      </Link>
      <div className="flex items-center gap-3 text-xs text-slate-600">
        <CircleHelp className="h-4 w-4 text-slate-400" strokeWidth={2} />
        <span>{USER_EMAIL}</span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-100 text-[10px] font-semibold text-pink-600">TH</span>
      </div>
    </header>
  );
}
