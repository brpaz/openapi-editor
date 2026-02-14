import { memo, useCallback } from "react";
import { useSpecStore } from "../../store/spec-store";
import { usePathErrors } from "../../hooks/useValidation";
import ValidationBadge from "../shared/ValidationBadge";
import SchemaEditor from "../schema/SchemaEditor";
import type { SchemaObject } from "../schema/PropertyList";
import { addSchemaAction, deleteNodeAction } from "../../store/actions/tree-actions";
import { usePromptDialog } from "../shared/PromptDialog";

interface SchemaPanelProps {
  name: string;
}

function SchemaPanelInner({ name }: SchemaPanelProps) {
  const spec = useSpecStore((s) => s.spec);
  const updateField = useSpecStore((s) => s.updateField);
  const schemaErrors = usePathErrors(["components", "schemas", name]);

  const handleUpdate = useCallback(
    (path: string[], value: unknown) => {
      if (value === undefined) {
        useSpecStore.getState().removeElement(path);
      } else {
        updateField(path, value);
      }
    },
    [updateField],
  );

  if (!spec) return null;

  const schemas = spec.components?.schemas as
    | Record<string, SchemaObject>
    | undefined;
  const schema = schemas?.[name];

  if (!schema) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Schema &ldquo;{name}&rdquo; not found
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Schema: {name}
        <ValidationBadge errors={schemaErrors} />
      </h2>
      <SchemaEditor
        schema={schema}
        basePath={["components", "schemas", name]}
        onUpdate={handleUpdate}
      />
    </div>
  );
}

export default memo(SchemaPanelInner);

export function SchemasListPanel() {
  const spec = useSpecStore((s) => s.spec);
  const setSelectedPath = useSpecStore((s) => s.setSelectedPath);
  const [prompt, promptDialog] = usePromptDialog();

  const handleAdd = useCallback(async () => {
    const name = await prompt("Schema name:");
    if (!name) return;
    addSchemaAction(name);
  }, [prompt]);

  if (!spec) return null;

  const schemas = spec.components?.schemas as
    | Record<string, SchemaObject>
    | undefined;
  const schemaNames = schemas ? Object.keys(schemas) : [];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Schemas
      </h2>

      {schemaNames.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
          No schemas defined
        </p>
      ) : (
        <div className="space-y-2">
          {schemaNames.map((name) => (
            <div
              key={name}
              className="flex items-center justify-between rounded border border-gray-200 p-3 dark:border-gray-700"
            >
              <button
                type="button"
                onClick={() =>
                  setSelectedPath(["components", "schemas", name])
                }
                className="text-left text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {name}
              </button>
              <button
                type="button"
                onClick={() =>
                  deleteNodeAction(["components", "schemas", name])
                }
                className="rounded px-1 text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
                title="Remove schema"
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
        + Add schema
      </button>
      {promptDialog}
    </div>
  );
}
