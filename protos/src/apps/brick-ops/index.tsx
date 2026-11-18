// Brick Ops: the Internal Ops persona on a phone. Home is a chat with the
// agent (Sol on the web; users name it themselves here, Brock to start),
// after Meta's Muse. The requests it needs a person for live in Needs Your
// Attention.
//
// Four tabs (Chat, Needs Your Attention, Goals, Automations) share a bottom
// tab bar. The menu sits under the screen: opening it slides the screen
// right, as Muse does, and a tap on the screen's edge closes it again.

import { ArrowLeft } from "lucide-react";
import { Route, Routes, useLocation, useParams } from "react-router-dom";
import { PhoneFrame } from "../../components/PhoneFrame";
import { BrickOpsProvider, useBrickOps } from "./BrickOpsContext";
import { Drawer } from "./components/Drawer";
import { TabBar } from "./components/TabBar";
import { Attention } from "./pages/Attention";
import { Automations } from "./pages/Automations";
import { Chat } from "./pages/Chat";
import { Goals } from "./pages/Goals";
import { Settings } from "./pages/Settings";

const TAB_PATHS = ["/brick-ops", "/brick-ops/attention", "/brick-ops/goals", "/brick-ops/automations"];

// Keyed by id, so moving between side chats starts each one fresh.
function SideChat() {
  const { chatId } = useParams();
  return <Chat key={chatId} chatId={chatId} />;
}

function Shell() {
  const { drawerOpen, setDrawerOpen } = useBrickOps();
  const { pathname } = useLocation();
  const onTab = TAB_PATHS.includes(pathname.replace(/\/$/, ""));

  return (
    <div className="brick-ops-type relative h-full overflow-clip bg-black">
      <Drawer />
      <div
        className={`absolute inset-0 overflow-clip bg-black transition-[transform,border-radius] duration-300 ease-out ${
          drawerOpen ? "translate-x-[82%] rounded-[2.9rem] ring-1 ring-white/10" : "translate-x-0"
        }`}
      >
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="chat/:chatId" element={<SideChat />} />
          <Route path="attention" element={<Attention />} />
          <Route path="goals" element={<Goals />} />
          <Route path="automations" element={<Automations />} />
          <Route path="settings" element={<Settings />} />
        </Routes>
        {onTab && <TabBar />}
        {/* While the menu is open the screen is only a way back. */}
        {drawerOpen && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 z-50"
          />
        )}
      </div>
    </div>
  );
}

export default function BrickOpsApp() {
  return (
    <BrickOpsProvider>
      <PhoneFrame
        statusBarTone="light"
        above={
          <a
            href="../"
            className="inline-flex items-center gap-1.5 rounded-md py-1 text-sm font-medium text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
            Back to site home
          </a>
        }
      >
        <Shell />
      </PhoneFrame>
    </BrickOpsProvider>
  );
}
