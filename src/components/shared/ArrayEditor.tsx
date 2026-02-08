import type { ReactNode } from "react";
import { useCallback } from "react";

interface ArrayEditorProps<T> {
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMove?: (fromIndex: number, toIndex: number) => void;
  renderItem: (item: T, index: number) => ReactNode;
  addLabel?: string;
  emptyLabel?: string;
  className?: string;
}

export default function ArrayEditor<T>({
  items,
  onAdd,
  onRemove,
  onMove,
  renderItem,
  addLabel = "Add item",
  emptyLabel = "No items",
  className,
}: ArrayEditorProps<T>) {
  const handleMoveUp = useCallback(
    (index: number) => {
      onMove?.(index, index - 1);
    },
    [onMove],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      onMove?.(index, index + 1);
    },
    [onMove],
  );

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
          {emptyLabel}
        </p>
      ) : (
        items.map((item, index) => (
          <div
            key={index}
            className="rounded border border-gray-200 p-3 dark:border-gray-700"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                #{index + 1}
              </span>
              <div className="flex items-center gap-1">
                {onMove && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="rounded px-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === items.length - 1}
                      className="rounded px-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                      title="Move down"
                    >
                      ↓
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="rounded px-1 text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            </div>
            {renderItem(item, index)}
          </div>
        ))
      )}
      <button
        type="button"
        onClick={onAdd}
        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        + {addLabel}
      </button>
    </div>
  );
}
