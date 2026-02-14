import { memo, useCallback } from "react";
import { useSpecStore } from "../../store/spec-store";
import { useFieldErrors } from "../../hooks/useValidation";
import FormField from "../shared/FormField";
import SchemaEditor from "../schema/SchemaEditor";
import type { SchemaObject } from "../schema/PropertyList";
import type { oas31 } from "openapi3-ts";
import { addParameterAction, deleteNodeAction } from "../../store/actions/tree-actions";
import { usePromptDialog } from "../shared/PromptDialog";

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

export function ParametersListPanel() {
  const spec = useSpecStore((s) => s.spec);
  const setSelectedPath = useSpecStore((s) => s.setSelectedPath);
  const [prompt, promptDialog] = usePromptDialog();

  const handleAdd = useCallback(async () => {
    const name = await prompt("Parameter name:");
    if (!name) return;
    addParameterAction(name);
  }, [prompt]);

  if (!spec) return null;

  const parameters = spec.components?.parameters as
    | Record<string, oas31.ParameterObject>
    | undefined;
  const parameterNames = parameters ? Object.keys(parameters) : [];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Parameters
      </h2>

      {parameterNames.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
          No parameters defined
        </p>
      ) : (
        <div className="space-y-2">
          {parameterNames.map((name) => {
            const param = parameters?.[name];
            const location = param && !("$ref" in param) ? param.in : "";
            return (
              <div
                key={name}
                className="flex items-center justify-between rounded border border-gray-200 p-3 dark:border-gray-700"
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPath(["components", "parameters", name])
                  }
                  className="text-left text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {name}
                  {location && (
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                      ({location})
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    deleteNodeAction(["components", "parameters", name])
                  }
                  className="rounded px-1 text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
                  title="Remove parameter"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={handleAdd}
        className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        + Add parameter
      </button>
      {promptDialog}
    </div>
  );
}
