import { memo, useCallback } from "react";
import { useSpecStore } from "../../store/spec-store";
import { usePathErrors } from "../../hooks/useValidation";
import ValidationBadge from "../shared/ValidationBadge";
import SchemaEditor from "../schema/SchemaEditor";
import type { SchemaObject } from "../schema/PropertyList";

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
