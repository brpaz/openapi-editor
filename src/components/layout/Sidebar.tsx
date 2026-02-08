import { useAppStore } from "../../store/app-store";
import SpecTree from "../tree/SpecTree";

export default function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed);

  if (collapsed) {
    return (
      <div className="flex h-full w-10 flex-col items-center border-r border-gray-200 bg-gray-50 pt-2 dark:border-gray-700 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="rounded p-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
          title="Expand sidebar"
        >
          ▶
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Explorer
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title="Collapse sidebar"
        >
          ◀
        </button>
      </div>
      <SpecTree />
    </div>
  );
}
