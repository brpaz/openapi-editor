import { memo, useCallback, useState } from "react";
import { useSpecStore } from "../../store/spec-store";
import { HTTP_METHODS } from "../../types/tree";
import type { HttpMethod } from "../../types/tree";
import type { oas31 } from "openapi3-ts";
import { addOperationAction, addPathAction, deleteNodeAction } from "../../store/actions/tree-actions";
import { usePromptDialog } from "../shared/PromptDialog";

interface PathPanelProps {
  pathKey: string;
}

function PathPanelInner({ pathKey }: PathPanelProps) {
  const spec = useSpecStore((s) => s.spec);
  const setSelectedPath = useSpecStore((s) => s.setSelectedPath);
  const [showMethodPicker, setShowMethodPicker] = useState(false);

  const handleAddOperation = useCallback(
    (method: HttpMethod) => {
      addOperationAction(pathKey, method);
      setShowMethodPicker(false);
    },
    [pathKey],
  );

  if (!spec) return null;

  const pathItem = spec.paths?.[pathKey] as
    | Record<string, oas31.OperationObject>
    | undefined;

  if (!pathItem) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Path &ldquo;{pathKey}&rdquo; not found
      </div>
    );
  }

  const operations = HTTP_METHODS.filter(
    (method) => pathItem[method] !== undefined,
  );
  const availableMethods = HTTP_METHODS.filter(
    (method) => pathItem[method] === undefined,
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Path
      </h2>
      <p className="mb-6 font-mono text-sm text-gray-700 dark:text-gray-300">
        {pathKey}
      </p>

      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
        Operations
      </h3>

      {operations.length === 0 ? (
        <p className="mb-3 text-sm text-gray-400 dark:text-gray-500">
          No operations defined
        </p>
      ) : (
        <div className="mb-3 space-y-2">
          {operations.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() =>
                setSelectedPath(["paths", pathKey, method])
              }
              className="flex w-full items-center gap-3 rounded border border-gray-200 px-3 py-2 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <MethodBadge method={method} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {(pathItem[method] as oas31.OperationObject)?.summary ||
                  (pathItem[method] as oas31.OperationObject)?.operationId ||
                  "(no summary)"}
              </span>
            </button>
          ))}
        </div>
      )}

      {availableMethods.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMethodPicker(!showMethodPicker)}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            + Add operation
          </button>
          {showMethodPicker && (
            <div className="absolute left-0 top-7 z-10 rounded border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {availableMethods.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => handleAddOperation(method)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <MethodBadge method={method} />
                  <span className="text-gray-700 dark:text-gray-300">
                    {method.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(PathPanelInner);

export function PathsListPanel() {
  const spec = useSpecStore((s) => s.spec);
  const setSelectedPath = useSpecStore((s) => s.setSelectedPath);
  const [prompt, promptDialog] = usePromptDialog();

  const handleAdd = useCallback(async () => {
    const pathString = await prompt("Path (e.g. /users):");
    if (!pathString) return;
    addPathAction(pathString);
  }, [prompt]);

  if (!spec) return null;

  const paths = spec.paths ? Object.keys(spec.paths) : [];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Paths
      </h2>

      {paths.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
          No paths defined
        </p>
      ) : (
        <div className="space-y-2">
          {paths.map((pathKey) => (
            <div
              key={pathKey}
              className="flex items-center justify-between rounded border border-gray-200 p-3 dark:border-gray-700"
            >
              <button
                type="button"
                onClick={() => setSelectedPath(["paths", pathKey])}
                className="text-left font-mono text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {pathKey}
              </button>
              <button
                type="button"
                onClick={() => deleteNodeAction(["paths", pathKey])}
                className="rounded px-1 text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
                title="Remove path"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={handleAdd}
        className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        + Add path
      </button>
      {promptDialog}
    </div>
  );
}

const METHOD_BG_COLORS: Record<HttpMethod, string> = {
  get: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  post: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  put: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  patch: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  options: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  head: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  trace: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 font-mono text-xs font-bold uppercase ${METHOD_BG_COLORS[method]}`}
    >
      {method}
    </span>
  );
}
