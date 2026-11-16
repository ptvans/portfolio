import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { BrandFilterControl } from "./components/BrandFilterControl";
import { AlertsProvider } from "./context/AlertsContext";
import { BrandFilterProvider } from "./context/BrandFilterContext";
import { MessagesProvider } from "./context/MessagesContext";
import { SopProvider } from "./context/SopContext";
import { StellaProvider } from "./context/StellaContext";
import { internalOpsNavItems } from "./navItems";
import { Assets } from "./pages/Assets";
import { Inventory } from "./pages/Inventory";
import { AlertRuleDetail } from "./pages/AlertRuleDetail";
import { AlertRuleEditor } from "./pages/AlertRuleEditor";
import { AllTasks } from "./pages/AllTasks";
import { Goals } from "./pages/Goals";
import { BrandDetail } from "./pages/BrandDetail";
import { Brands } from "./pages/Brands";
import { Messages } from "./pages/Messages";
import { NetworkOperatorDetail } from "./pages/NetworkOperatorDetail";
import { NetworkOperators } from "./pages/NetworkOperators";
import { ProjectDetail } from "./pages/ProjectDetail";
import { ProjectsDashboard } from "./pages/ProjectsDashboard";
import { ProjectsIndex } from "./pages/ProjectsIndex";
import { CreatedSop } from "./pages/CreatedSop";
import { SopAnalysis } from "./pages/SopAnalysis";
import { SopAuthor } from "./pages/SopAuthor";
import { SopDetail } from "./pages/SopDetail";
import { SopRequests } from "./pages/SopRequests";
import { Sops } from "./pages/Sops";
import { SopsBrand } from "./pages/SopsBrand";
import { Stella } from "./pages/Stella";

// The brand filter header is shown on every page except the home (Stella)
// and the Brands section (which are inherently not brand-scoped).
//
// The brand filter is switched off for now (BRAND_FILTER_ENABLED); flip it back
// on to restore the header control and the filtering on every page.
const BRAND_FILTER_ENABLED = false;

function showBrandFilter(pathname: string): boolean {
  if (!BRAND_FILTER_ENABLED) return false;
  if (pathname === "/internal-ops" || pathname === "/internal-ops/") return false; // Stella home
  if (pathname.startsWith("/internal-ops/brands")) return false; // Brands + Brand detail
  if (pathname.startsWith("/internal-ops/sops")) return false; // SOPs are scoped on their own
  return true;
}

// The three views of an SOP are focused, full-window workspaces with their own
// top bar, so they render outside the app shell entirely: the definition
// (…/versions/:version), one run instance (…/runs/:runId), and the aggregate
// analysis across every run (…/analysis). The SOP detail page at sops/:id,
// which indexes the runs and versions, stays in the shell.
const SOP_WORKSPACE_PATH = /^\/internal-ops\/sops\/[^/]+\/((runs|versions)\/[^/]+|analysis)\/?$/;

function InternalOpsShell() {
  const { pathname } = useLocation();
  if (SOP_WORKSPACE_PATH.test(pathname)) {
    return (
      <Routes>
        <Route path="sops/:id/runs/:runId" element={<SopAuthor />} />
        <Route path="sops/:id/versions/:version" element={<SopAuthor />} />
        <Route path="sops/:id/analysis" element={<SopAnalysis />} />
      </Routes>
    );
  }
  return (
    <AppShell
      personaLabel="Build Internal Ops"
      personaSubtitle="Superuser"
      accent="brand"
      navItems={internalOpsNavItems}
      navPlacement="header"
      headerActions={showBrandFilter(pathname) ? <BrandFilterControl /> : undefined}
      fullBleed={
        /^\/internal-ops\/?$/.test(pathname) ||
        /^\/internal-ops\/(messages|sops|my-work|my-work\/resolved)\/?$/.test(pathname) ||
        // The SOP page scrolls itself, so its instructions can stay pinned.
        (/^\/internal-ops\/sops\/[^/]+\/?$/.test(pathname) && !/\/sops\/list\/?$/.test(pathname))
      }
    >
      <Routes>
        {/* Stella is the home: what needs you, and the box to ask her in. */}
        <Route path="/" element={<Stella />} />
        {/* Her old address still lands, with its query (?ask=, ?new). */}
        <Route path="stella" element={<StellaRedirect />} />
        {/* Every My Work group, in the Stella page; the home and sidebar
            show the first few. */}
        <Route path="my-work" element={<Stella view="digest" />} />
        <Route path="my-work/resolved" element={<Stella view="resolved" />} />
        <Route path="projects" element={<ProjectsDashboard />} />
        <Route path="projects/list" element={<ProjectsIndex />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="brands" element={<Brands />} />
        <Route path="brands/:id" element={<BrandDetail />} />
        <Route path="network-operators" element={<NetworkOperators />} />
        <Route path="network-operators/:id" element={<NetworkOperatorDetail />} />
        {/* The Automation section: SOPs lands on the requests the SOPs have
            raised (Requests); Automations Setup, at sops/list, tabs the SOPs
            themselves (Standard and Alert in one list) and the Goals. */}
        <Route path="sops" element={<SopRequests />} />
        <Route path="sops/list" element={<Sops />} />
        {/* The by-brand pages: a static segment, so it wins over sops/:id. */}
        <Route path="sops/brands/:brandId" element={<SopsBrand />} />
        {/* SOPs written in a Stella chat, read from the chat. */}
        <Route path="sops/created/:draftId" element={<CreatedSop />} />
        <Route path="sops/:id" element={<SopDetail />} />
        <Route path="alerts" element={<Navigate to="/internal-ops/sops/list" replace />} />
        <Route path="alerts/new" element={<AlertRuleEditor />} />
        <Route path="alerts/:ruleId" element={<AlertRuleDetail />} />
        <Route path="alerts/:ruleId/edit" element={<AlertRuleEditor />} />
        <Route path="goals" element={<Goals />} />
        <Route path="messages" element={<Messages />} />
        {/* Old links still land: the alerts inbox became Messages, alert rules
            became SOPs of type Alert and then moved from sops/alerts to
            alerts. Static segments, so these win over alerts/:ruleId. */}
        <Route path="alerts/dismissed" element={<Navigate to="/internal-ops/messages?status=archived" replace />} />
        <Route path="alerts/rules/*" element={<LegacyRulesRedirect />} />
        <Route path="messages/rules/*" element={<LegacyRulesRedirect />} />
        <Route path="sops/alerts/*" element={<LegacySopAlertsRedirect />} />
        <Route path="tasks" element={<AllTasks />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="assets" element={<Assets />} />
      </Routes>
    </AppShell>
  );
}

// …/stella?… → the home, query kept.
function StellaRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/internal-ops${search}`} replace />;
}

// Old rule URLs (…/alerts/rules/… and …/messages/rules/…) → the Automation
// pages: the index → the SOPs list, a brand's rules → its SOP page, a rule →
// its Alert page. The query (e.g. ?brand= on "new") is kept.
function LegacyRulesRedirect() {
  const { pathname, search } = useLocation();
  const rest = pathname.replace(/^\/internal-ops\/(alerts|messages)\/rules\/?/, "");
  const to = !rest
    ? "/internal-ops/sops/list"
    : rest.startsWith("brands/")
      ? `/internal-ops/sops/${rest}`
      : `/internal-ops/alerts/${rest}`;
  return <Navigate to={to + search} replace />;
}

// …/sops/alerts/… → …/alerts/…, query kept.
function LegacySopAlertsRedirect() {
  const { pathname, search } = useLocation();
  const rest = pathname.replace(/^\/internal-ops\/sops\/alerts\/?/, "");
  return <Navigate to={`/internal-ops/alerts${rest ? `/${rest}` : ""}${search}`} replace />;
}

export default function InternalOpsApp() {
  return (
    <BrandFilterProvider enabled={BRAND_FILTER_ENABLED}>
      <SopProvider>
        <AlertsProvider>
          <MessagesProvider>
            <StellaProvider>
              <InternalOpsShell />
            </StellaProvider>
          </MessagesProvider>
        </AlertsProvider>
      </SopProvider>
    </BrandFilterProvider>
  );
}
