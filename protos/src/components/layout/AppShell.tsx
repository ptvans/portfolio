import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useThemeScope } from "../../lib/theme";
import { ThemeToggle } from "../ThemeToggle";

export type PersonaAccent = "brand" | "op" | "brick";

export interface NavChild {
  label: string;
  to: string;
  // When true, the link is only active on an exact path match (default: false,
  // so a parent path stays active on its sub-routes).
  end?: boolean;
  // Further path prefixes this link counts as active on — pages reached from
  // it that live under another URL (e.g. the tabs of one page).
  match?: string[];
  // Set by the app when the URL can't tell — links that open something in
  // place rather than a page of their own. Overrides the path matching.
  active?: boolean;
}

// Any icon component that takes a className: lucide icons and custom marks.
type NavIcon = ComponentType<{ className?: string; strokeWidth?: number }>;

export interface NavItem {
  label: string;
  to: string;
  icon: NavIcon;
  // What the header nav draws: just the icon (the label becomes its tooltip
  // and accessible name), just the label, or both when left out. The
  // sidebar always draws both, since its collapsed rail is icons.
  show?: "icon" | "label";
  // Only active on an exact path match (e.g. an app's root Overview).
  end?: boolean;
  // Optional sub-items — renders the item as a collapsible group header.
  children?: NavChild[];
  // Further path prefixes a group counts as active on — pages of its section
  // that no sub-item links to directly.
  match?: string[];
  // As on NavChild: the app's own say on whether this link is current.
  active?: boolean;
}

const ACCENT_CLASSES: Record<PersonaAccent, { activeBg: string; activeText: string; ring: string }> = {
  brand: { activeBg: "bg-brand-50", activeText: "text-brand-700", ring: "ring-brand-200" },
  op: { activeBg: "bg-op-50", activeText: "text-op-700", ring: "ring-op-200" },
  brick: { activeBg: "bg-brick-50", activeText: "text-brick-700", ring: "ring-brick-200" },
};

function childActive(child: NavChild, pathname: string) {
  if (child.end ? pathname === child.to : pathname.startsWith(child.to)) return true;
  return (child.match ?? []).some((prefix) => pathname.startsWith(prefix));
}

function groupActive(item: NavItem, pathname: string) {
  return (item.children ?? []).some((c) => childActive(c, pathname)) || (item.match ?? []).some((p) => pathname.startsWith(p));
}

export function AppShell({
  personaLabel,
  personaSubtitle,
  accent,
  navItems,
  children,
  headerActions,
  chromeless = false,
  fullBleed = false,
  navPlacement = "sidebar",
  appSwitcher,
  navHeading,
  headerStart,
  headerRule,
}: {
  personaLabel: string;
  // Left out, the header shows the label alone, as a title.
  personaSubtitle?: string;
  accent: PersonaAccent;
  navItems: NavItem[];
  children: ReactNode;
  headerActions?: ReactNode;
  // Focused modes (e.g. Manage Shifts) hide the nav rail and header bar so the
  // page has the full window. The page itself provides the way back out.
  chromeless?: boolean;
  // Keeps the nav rail but drops the main area's padding and page scroll, for
  // pages that lay out their own columns to the full height (e.g. Sol).
  fullBleed?: boolean;
  // "header" lays the nav out as tabs across the top bar instead of a left rail.
  navPlacement?: "sidebar" | "header";
  // The dialpad (see AppSwitcher), drawn left of the logo.
  appSwitcher?: ReactNode;
  // A heading over the sidebar nav — the sub-app it belongs to.
  navHeading?: string;
  // Sidebar layout: what sits at the left of the top bar (a page's own
  // title), and a rule to draw under the bar in place of its plain border.
  headerStart?: ReactNode;
  headerRule?: ReactNode;
}) {
  const accentClasses = ACCENT_CLASSES[accent];
  const [collapsed, setCollapsed] = useState(false);
  useThemeScope();

  if (chromeless) {
    return (
      <div className="h-screen overflow-y-auto bg-slate-50">
        {/* No bottom padding: the page's own last element sits flush to the
            bottom of the window. */}
        <main className="px-4 pt-4">{children}</main>
      </div>
    );
  }

  if (navPlacement === "header") {
    // A section with sub-pages opens a dropdown of them on click; the others
    // are plain links.
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
        <header className="shrink-0 border-b border-slate-200 bg-white">
          <div className="flex h-14 items-center gap-4 px-4">
            <a
              href="../"
              title="Back to portfolio"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </a>
            {appSwitcher}
            <div className="flex shrink-0 items-center gap-2 pr-2">
              <img src="./logo.svg" alt="" className="h-8 w-8 shrink-0" />
              <div className="leading-tight max-md:hidden">
                <p className="whitespace-nowrap text-sm font-semibold text-slate-900">{personaLabel}</p>
                {personaSubtitle && <p className="whitespace-nowrap text-xs text-slate-500">{personaSubtitle}</p>}
              </div>
            </div>
            {/* Below 768px the nav collapses into a menu button. */}
            <div className="min-w-0 flex-1 md:hidden">
              <HeaderNavDrawer navItems={navItems} accentClasses={accentClasses} personaLabel={personaLabel} />
            </div>
            <nav className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto max-md:hidden">
              {navItems.map((item) =>
                item.children ? (
                  <HeaderNavMenu key={item.to} item={item} accentClasses={accentClasses} />
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={item.show === "icon" ? item.label : undefined}
                    aria-label={item.show === "icon" ? item.label : undefined}
                    className={({ isActive }) =>
                      `${headerTabClass(item.show === "icon")} ${
                        isActive ? `${accentClasses.activeBg} ${accentClasses.activeText}` : "text-slate-600 hover:bg-slate-100"
                      }`
                    }
                  >
                    {item.show !== "label" && <item.icon className="h-4 w-4" strokeWidth={2} />}
                    {item.show !== "icon" && item.label}
                  </NavLink>
                ),
              )}
            </nav>
            <div className="flex shrink-0 items-center gap-3">
              {headerActions}
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className={fullBleed ? "min-h-0 flex-1 overflow-hidden" : "flex-1 overflow-y-auto p-6"}>{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside
        className={`flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        <div
          className={`flex items-center gap-2 border-b border-slate-200 py-4 ${
            collapsed ? `px-3 ${appSwitcher ? "flex-col" : ""}` : appSwitcher ? "pl-3 pr-5" : "px-5"
          }`}
        >
          {appSwitcher}
          <img src="./logo.svg" alt="" className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className={`truncate font-semibold text-slate-900 ${personaSubtitle ? "text-sm" : "text-base"}`}>
                {personaLabel}
              </p>
              {personaSubtitle && <p className="truncate text-xs text-slate-500">{personaSubtitle}</p>}
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4.5 w-4.5" strokeWidth={2} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="mx-auto mt-2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" strokeWidth={2} />
          </button>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navHeading && !collapsed && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{navHeading}</p>
          )}
          {navItems.map((item) =>
            item.children ? (
              <NavGroup key={item.to} item={item} accentClasses={accentClasses} collapsed={collapsed} />
            ) : collapsed ? (
              <RailIcon
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                accentClasses={accentClasses}
              />
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    (item.active ?? isActive)
                      ? `${accentClasses.activeBg} ${accentClasses.activeText}`
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <item.icon className="h-4 w-4" strokeWidth={2} />
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className={`flex gap-1 border-t border-slate-200 p-3 ${collapsed ? "flex-col items-center" : "items-center"}`}>
          <a
            href="../"
            title={collapsed ? "Back to portfolio" : undefined}
            className={`flex items-center gap-2 rounded-lg py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 ${
              collapsed ? "justify-center px-2" : "min-w-0 flex-1 px-3"
            }`}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
            {!collapsed && "Back to portfolio"}
          </a>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {(headerActions || headerStart) && (
          <div
            className={`flex shrink-0 items-center gap-3 bg-white px-6 py-3 ${
              headerRule ? "" : "border-b border-slate-200"
            }`}
          >
            {headerStart}
            <div className="ml-auto flex items-center gap-3">{headerActions}</div>
          </div>
        )}
        {headerRule}
        <main className={fullBleed ? "min-h-0 flex-1 overflow-hidden" : "flex-1 overflow-y-auto p-6"}>{children}</main>
      </div>
    </div>
  );
}

function headerTabClass(iconOnly: boolean) {
  return `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg py-1.5 text-sm font-medium transition-colors ${
    iconOnly ? "px-2" : "px-3"
  }`;
}

// A header section with sub-pages: clicking it opens a dropdown listing them.
// The tab reads as active while any sub-page is; the dropdown closes on a
// pick, a click outside, or Escape.
// The header nav on a phone: one button that drops every section and
// sub-page down as a list under the bar.
function HeaderNavDrawer({
  navItems,
  accentClasses,
  personaLabel,
}: {
  navItems: NavItem[];
  accentClasses: (typeof ACCENT_CLASSES)[PersonaAccent];
  personaLabel: string;
}) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

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

  const link = (active: boolean) =>
    `block rounded-md px-3 py-2 text-sm ${active ? `${accentClasses.activeBg} ${accentClasses.activeText} font-medium` : "text-slate-700 hover:bg-slate-50"}`;

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Menu"
        className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
      >
        <Menu className="h-5 w-5 text-slate-600" strokeWidth={2} />
        <span className="truncate">{personaLabel}</span>
      </button>
      {open && (
        <nav className="fixed inset-x-0 top-14 z-40 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-slate-200 bg-white p-2 shadow-lg">
          {navItems.map((item) =>
            item.children ? (
              <div key={item.to} className="py-1">
                <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-slate-400">{item.label}</p>
                {item.children.map((c) => (
                  <NavLink key={c.to} to={c.to} end={c.end} className={link(c.active ?? childActive(c, location.pathname))}>
                    {c.label}
                  </NavLink>
                ))}
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => link(item.active ?? isActive)}>
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
      )}
    </div>
  );
}

function HeaderNavMenu({
  item,
  accentClasses,
}: {
  item: NavItem;
  accentClasses: (typeof ACCENT_CLASSES)[PersonaAccent];
}) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  // The nav strip scrolls horizontally, so it would clip a menu positioned
  // inside it. The menu is fixed to the viewport, under the tab.
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const active = groupActive(item, location.pathname);

  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setAnchor({ left: r.left, top: r.bottom });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${headerTabClass(item.show === "icon")} ${
          active || open ? `${accentClasses.activeBg} ${accentClasses.activeText}` : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        {item.show !== "label" && <item.icon className="h-4 w-4" strokeWidth={2} />}
        {item.show !== "icon" && item.label}
        <ChevronDown
          className={`-mr-0.5 h-3.5 w-3.5 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>
      {open && anchor && (
        <div
          role="menu"
          style={{ left: anchor.left, top: anchor.top + 6 }}
          className="fixed z-30 min-w-[11rem] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          {item.children?.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              end={child.end}
              role="menuitem"
              className={({ isActive }) =>
                `block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  (child.active ?? (isActive || childActive(child, location.pathname)))
                    ? `${accentClasses.activeBg} ${accentClasses.activeText}`
                    : "text-slate-700 hover:bg-slate-100"
                }`
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function NavGroup({
  item,
  accentClasses,
  collapsed,
}: {
  item: NavItem;
  accentClasses: (typeof ACCENT_CLASSES)[PersonaAccent];
  collapsed: boolean;
}) {
  const location = useLocation();
  const [open, setOpen] = useState(true);

  if (collapsed) {
    const active = groupActive(item, location.pathname);
    return (
      <RailIcon
        to={item.children?.[0]?.to ?? item.to}
        icon={item.icon}
        label={item.label}
        accentClasses={accentClasses}
        forceActive={active}
      />
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
      >
        <item.icon className="h-4 w-4" strokeWidth={2} />
        {item.label}
        {open ? (
          <ChevronDown className="ml-auto h-4 w-4 text-slate-400" strokeWidth={2} />
        ) : (
          <ChevronRight className="ml-auto h-4 w-4 text-slate-400" strokeWidth={2} />
        )}
      </button>
      {open && (
        <div className="mt-1 space-y-1 pl-9">
          {item.children?.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              end={child.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  (child.active ?? (isActive || childActive(child, location.pathname)))
                    ? `${accentClasses.activeBg} ${accentClasses.activeText}`
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function RailIcon({
  to,
  icon: Icon,
  label,
  accentClasses,
  end,
  forceActive,
}: {
  to: string;
  icon: NavIcon;
  label: string;
  accentClasses: (typeof ACCENT_CLASSES)[PersonaAccent];
  end?: boolean;
  forceActive?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) =>
        `flex items-center justify-center rounded-lg p-3 transition-colors ${
          isActive || forceActive
            ? `${accentClasses.activeBg} ${accentClasses.activeText}`
            : "text-slate-500 hover:bg-slate-100"
        }`
      }
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </NavLink>
  );
}
