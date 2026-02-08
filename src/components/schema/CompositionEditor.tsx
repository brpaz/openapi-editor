import { useState, useCallback, useMemo } from "react";
import type { SchemaObject } from "./PropertyList";

type CompositionKeyword = "oneOf" | "anyOf" | "allOf";

const COMPOSITION_TABS: { label: string; key: CompositionKeyword }[] = [
  { label: "oneOf", key: "oneOf" },
  { label: "anyOf", key: "anyOf" },
  { label: "allOf", key: "allOf" },
];

interface CompositionEditorProps {
  schema: SchemaObject;
  basePath: string[];
  onUpdate: (path: string[], value: unknown) => void;
  renderSchemaEditor: (
    schema: SchemaObject,
    path: string[],
    depth: number,
  ) => React.ReactNode;
  depth?: number;
}

export default function CompositionEditor({
  schema,
  basePath,
  onUpdate,
  renderSchemaEditor,
  depth = 0,
}: CompositionEditorProps) {
  const activeKeyword: CompositionKeyword | null = schema.oneOf
    ? "oneOf"
    : schema.anyOf
      ? "anyOf"
      : schema.allOf
        ? "allOf"
        : null;

  const [selectedTab, setSelectedTab] = useState<CompositionKeyword>(
    activeKeyword ?? "oneOf",
  );

  const items = useMemo(
    () => (schema[selectedTab] as SchemaObject[] | undefined) ?? [],
    [schema, selectedTab],
  );

  const handleAdd = useCallback(() => {
    const newItems = [...items, { type: "object" } as SchemaObject];
    onUpdate([...basePath, selectedTab], newItems);
  }, [items, basePath, selectedTab, onUpdate]);

  const handleRemove = useCallback(
    (index: number) => {
      const newItems = items.filter((_, i) => i !== index);
      if (newItems.length === 0) {
        onUpdate([...basePath, selectedTab], undefined);
      } else {
        onUpdate([...basePath, selectedTab], newItems);
      }
    },
    [items, basePath, selectedTab, onUpdate],
  );

  return (
    <div className="space-y-2">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {COMPOSITION_TABS.map((tab) => {
          const hasItems =
            Array.isArray(schema[tab.key]) &&
            (schema[tab.key] as SchemaObject[]).length > 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedTab(tab.key)}
              className={`px-3 py-1 text-xs font-medium ${
                selectedTab === tab.key
                  ? "border-b-2 border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              } ${hasItems ? "font-bold" : ""}`}
            >
              {tab.label}
              {hasItems && (
                <span className="ml-1 text-xs">
                  ({(schema[tab.key] as SchemaObject[]).length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <p className="py-2 text-center text-sm text-gray-400 dark:text-gray-500">
          No {selectedTab} schemas
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
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="rounded px-1 text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
                title="Remove"
              >
                ×
              </button>
            </div>
            {renderSchemaEditor(
              item,
              [...basePath, selectedTab, index.toString()],
              depth + 1,
            )}
          </div>
        ))
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        + Add {selectedTab} schema
      </button>
    </div>
  );
}
