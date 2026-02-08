import { useCallback } from "react";

interface KeyValueEditorProps {
  entries: Record<string, string>;
  onChange: (entries: Record<string, string>) => void;
  keyLabel?: string;
  valueLabel?: string;
  addLabel?: string;
  className?: string;
}

export default function KeyValueEditor({
  entries,
  onChange,
  keyLabel = "Key",
  valueLabel = "Value",
  addLabel = "Add entry",
  className,
}: KeyValueEditorProps) {
  const keys = Object.keys(entries);

  const handleKeyChange = useCallback(
    (oldKey: string, newKey: string) => {
      const newEntries: Record<string, string> = {};
      for (const k of keys) {
        if (k === oldKey) {
          newEntries[newKey] = entries[oldKey] ?? "";
        } else {
          newEntries[k] = entries[k] ?? "";
        }
      }
      onChange(newEntries);
    },
    [entries, keys, onChange],
  );

  const handleValueChange = useCallback(
    (key: string, value: string) => {
      onChange({ ...entries, [key]: value });
    },
    [entries, onChange],
  );

  const handleRemove = useCallback(
    (key: string) => {
      const newEntries: Record<string, string> = {};
      for (const k of keys) {
        if (k !== key) {
          newEntries[k] = entries[k] ?? "";
        }
      }
      onChange(newEntries);
    },
    [entries, keys, onChange],
  );

  const handleAdd = useCallback(() => {
    let newKey = "key";
    let counter = 1;
    while (newKey in entries) {
      newKey = `key${counter}`;
      counter++;
    }
    onChange({ ...entries, [newKey]: "" });
  }, [entries, onChange]);

  const inputClasses =
    "w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400";

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {keys.length > 0 && (
        <div className="flex gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          <span className="flex-1">{keyLabel}</span>
          <span className="flex-1">{valueLabel}</span>
          <span className="w-6" />
        </div>
      )}
      {keys.length === 0 ? (
        <p className="py-2 text-center text-sm text-gray-400 dark:text-gray-500">
          No entries
        </p>
      ) : (
        keys.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <input
              type="text"
              value={key}
              onChange={(e) => handleKeyChange(key, e.target.value)}
              className={`flex-1 ${inputClasses}`}
              placeholder={keyLabel}
            />
            <input
              type="text"
              value={entries[key] ?? ""}
              onChange={(e) => handleValueChange(key, e.target.value)}
              className={`flex-1 ${inputClasses}`}
              placeholder={valueLabel}
            />
            <button
              type="button"
              onClick={() => handleRemove(key)}
              className="rounded px-1 text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
              title="Remove"
            >
              ×
            </button>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={handleAdd}
        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        + {addLabel}
      </button>
    </div>
  );
}
