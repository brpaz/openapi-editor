import { memo } from "react";
import { useAppStore } from "../../store/app-store";
import {
  openFileAction,
  newSpecAction,
  openRecentFileAction,
} from "../../store/actions/file-actions";

function WelcomePanelInner() {
  const recentFiles = useAppStore((s) => s.recentFiles);

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          OpenAPI Editor
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Visual editor for OpenAPI 3.1 specifications
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => void newSpecAction()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Spec
          </button>
          <button
            type="button"
            onClick={() => void openFileAction()}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Open File
          </button>
        </div>
        {recentFiles.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-2 text-sm font-bold text-gray-700 dark:text-gray-300">
              Recent Files
            </h2>
            <ul className="space-y-1">
              {recentFiles.map((file) => (
                <li key={file.path}>
                  <button
                    type="button"
                    onClick={() => void openRecentFileAction(file.path)}
                    className="w-full cursor-pointer rounded p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {file.name}
                    </div>
                    <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {file.path}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(WelcomePanelInner);
