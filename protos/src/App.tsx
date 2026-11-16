import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import BrickOpsApp from "./apps/brick-ops";
import InternalOpsApp from "./apps/internal-ops";
import { AppDataProvider } from "./state/AppDataContext";
import { AssetsProvider } from "./state/AssetsContext";

// Two prototypes extracted from thom-proto for the portfolio site.
// HashRouter keeps deep links working on static GitHub Pages hosting.
export const COCO_GRAPH_PATH = "/internal-ops/sops/sop-coco-dispatch/versions/3?view=graph";

function App() {
  return (
    <HashRouter>
      <AppDataProvider>
        <AssetsProvider>
          <Routes>
            <Route path="/" element={<Navigate to={COCO_GRAPH_PATH} replace />} />
            <Route path="/internal-ops/*" element={<InternalOpsApp />} />
            <Route path="/brick-ops/*" element={<BrickOpsApp />} />
            <Route path="*" element={<Navigate to={COCO_GRAPH_PATH} replace />} />
          </Routes>
        </AssetsProvider>
      </AppDataProvider>
    </HashRouter>
  );
}

export default App;
