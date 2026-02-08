import { memo, useCallback } from "react";
import { useSpecStore } from "../../store/spec-store";
import { useFieldErrors } from "../../hooks/useValidation";
import FormField from "../shared/FormField";
import SchemaEditor from "../schema/SchemaEditor";
import type { SchemaObject } from "../schema/PropertyList";
import type { oas31 } from "openapi3-ts";

function ParameterPanelInner({ name }: { name: string }) {
  const spec = useSpecStore((s) => s.spec);
  const updateField = useSpecStore((s) => s.updateField);
  const getFieldError = useFieldErrors(["components", "parameters", name]);

  const handleFieldChange = useCallback(
    (field: string, value: string | number | boolean) => {
      updateField(["components", "parameters", name, field], value);
    },
    [updateField, name],
  );

  const handleSchemaUpdate = useCallback(
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

  const parameter = spec.components?.parameters?.[name] as
    | (oas31.ParameterObject & { schema?: SchemaObject })
    | undefined;

  if (!parameter) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Parameter &ldquo;{name}&rdquo; not found
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Parameter: {name}
      </h2>

      <div className="space-y-4">
        <FormField
          label="Name"
          value={parameter.name ?? ""}
          onChange={(v) => handleFieldChange("name", v)}
          required
          placeholder="Parameter name"
          error={getFieldError("name")}
        />

        <FormField
          label="In"
          value={parameter.in ?? ""}
          onChange={(v) => handleFieldChange("in", v)}
          type="select"
          required
          options={[
            { label: "path", value: "path" },
            { label: "query", value: "query" },
            { label: "header", value: "header" },
            { label: "cookie", value: "cookie" },
          ]}
          error={getFieldError("in")}
        />

        <FormField
          label="Required"
          value={Boolean(parameter.required)}
          onChange={(v) => handleFieldChange("required", v)}
          type="checkbox"
        />

        <FormField
          label="Deprecated"
          value={Boolean(parameter.deprecated)}
          onChange={(v) => handleFieldChange("deprecated", v)}
          type="checkbox"
        />

        <FormField
          label="Description"
          value={typeof parameter.description === "string" ? parameter.description : ""}
          onChange={(v) => handleFieldChange("description", v)}
          type="textarea"
          placeholder="Parameter description"
          error={getFieldError("description")}
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Schema
          </label>
          {parameter.schema && (
            <SchemaEditor
              schema={parameter.schema}
              basePath={["components", "parameters", name, "schema"]}
              onUpdate={handleSchemaUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ParameterPanelInner);
