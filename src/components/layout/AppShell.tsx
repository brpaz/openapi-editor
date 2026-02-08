import { useAppStore } from "../../store/app-store";
import { useSpecStore } from "../../store/spec-store";
import { useWindowTitle } from "../../hooks/useWindowTitle";
import { useCloseHandler } from "../../hooks/useCloseHandler";
import Toolbar from "./Toolbar";
import ErrorBanner from "./ErrorBanner";
import Sidebar from "./Sidebar";
import SplitPane from "./SplitPane";
import StatusBar from "./StatusBar";
import WelcomePanel from "../panels/WelcomePanel";
import PanelRouter from "../panels/PanelRouter";
import LoadingOverlay from "./LoadingOverlay";

export default function AppShell() {
  useWindowTitle();
  useCloseHandler();
  const spec = useSpecStore((s) => s.spec);
  const selectedPath = useSpecStore((s) => s.selectedPath);
  const sidebarWidth = useAppStore((s) => s.sidebarWidth);
  const setSidebarWidth = useAppStore((s) => s.setSidebarWidth);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

  function renderPanel() {
    if (!spec) return <WelcomePanel />;
    if (!selectedPath || selectedPath.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          Select an item from the tree
        </div>
      );
    }
    return <PanelRouter path={selectedPath} />;
  }

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-gray-900">
      <LoadingOverlay />
      <Toolbar />
      <ErrorBanner />
      <div className="flex-1 overflow-hidden">
        {sidebarCollapsed ? (
          <div className="flex h-full overflow-hidden">
            <Sidebar />
            <div className="h-full flex-1 overflow-y-auto">
              {renderPanel()}
            </div>
          </div>
        ) : (
          <SplitPane
            left={<Sidebar />}
            right={renderPanel()}
            defaultWidth={sidebarWidth}
            onWidthChange={setSidebarWidth}
          />
        )}
      </div>
      <StatusBar />
    </div>
  );
}
