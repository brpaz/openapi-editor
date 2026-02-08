import { memo } from "react";
import { useSpecStore } from "../../store/spec-store";
import { HTTP_METHODS } from "../../types/tree";
import type { HttpMethod } from "../../types/tree";
import type { oas31 } from "openapi3-ts";

interface PathPanelProps {
  pathKey: string;
}

function PathPanelInner({ pathKey }: PathPanelProps) {
  const spec = useSpecStore((s) => s.spec);
  const setSelectedPath = useSpecStore((s) => s.setSelectedPath);

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
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No operations defined
        </p>
      ) : (
        <div className="space-y-2">
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
    </div>
  );
}

export default memo(PathPanelInner);

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
