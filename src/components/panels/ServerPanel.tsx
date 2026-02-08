import { memo, useCallback } from "react";
import { useSpecStore } from "../../store/spec-store";
import { useFieldErrors } from "../../hooks/useValidation";
import FormField from "../shared/FormField";
import ArrayEditor from "../shared/ArrayEditor";
import KeyValueEditor from "../shared/KeyValueEditor";
import type { oas31 } from "openapi3-ts";

function getServers(spec: oas31.OpenAPIObject): oas31.ServerObject[] {
  return Array.isArray(spec.servers) ? spec.servers : [];
}

function getVariables(
  server: oas31.ServerObject,
): Record<string, string> {
  if (!server.variables) return {};
  const result: Record<string, string> = {};
  for (const [key, variable] of Object.entries(server.variables)) {
    result[key] = typeof variable.default === "string" ? variable.default : "";
  }
  return result;
}

function ServerPanelInner({ index }: { index: number }) {
  const spec = useSpecStore((s) => s.spec);
  const updateField = useSpecStore((s) => s.updateField);
  const getFieldError = useFieldErrors(["servers", index.toString()]);

  const handleFieldChange = useCallback(
    (field: string, value: string | number | boolean) => {
      updateField(["servers", index.toString(), field], value);
    },
    [updateField, index],
  );

  const handleVariablesChange = useCallback(
    (entries: Record<string, string>) => {
      const variables: Record<
        string,
        { default: string }
      > = {};
      for (const [key, value] of Object.entries(entries)) {
        variables[key] = { default: value };
      }
      updateField(["servers", index.toString(), "variables"], variables);
    },
    [updateField, index],
  );

  if (!spec) return null;

  const servers = getServers(spec);
  const server = servers[index];
  if (!server) return null;

  const variables = getVariables(server);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Server #{index + 1}
      </h2>

      <div className="space-y-4">
        <FormField
          label="URL"
          value={server.url ?? ""}
          onChange={(v) => handleFieldChange("url", v)}
          required
          placeholder="https://api.example.com/v1"
          error={getFieldError("url")}
        />

        <FormField
          label="Description"
          value={typeof server.description === "string" ? server.description : ""}
          onChange={(v) => handleFieldChange("description", v)}
          type="textarea"
          placeholder="Production server"
          error={getFieldError("description")}
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Server Variables
          </label>
          <KeyValueEditor
            entries={variables}
            onChange={handleVariablesChange}
            keyLabel="Variable"
            valueLabel="Default Value"
            addLabel="Add variable"
          />
        </div>
      </div>
    </div>
  );
}

export default memo(ServerPanelInner);

export function ServersListPanel() {
  const spec = useSpecStore((s) => s.spec);
  const updateField = useSpecStore((s) => s.updateField);
  const removeElement = useSpecStore((s) => s.removeElement);
  const setSelectedPath = useSpecStore((s) => s.setSelectedPath);

  const handleAdd = useCallback(() => {
    if (!spec) return;
    const servers = getServers(spec);
    const index = servers.length;
    updateField(["servers"], [...servers, { url: "https://api.example.com" }]);
    setSelectedPath(["servers", index.toString()]);
  }, [spec, updateField, setSelectedPath]);

  const handleRemove = useCallback(
    (index: number) => {
      removeElement(["servers", index.toString()]);
    },
    [removeElement],
  );

  if (!spec) return null;

  const servers = getServers(spec);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Servers
      </h2>

      <ArrayEditor
        items={servers}
        onAdd={handleAdd}
        onRemove={handleRemove}
        addLabel="Add server"
        emptyLabel="No servers defined"
        renderItem={(server, i) => (
          <button
            type="button"
            onClick={() => setSelectedPath(["servers", i.toString()])}
            className="w-full text-left text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {server.url || "(no url)"}
          </button>
        )}
      />
    </div>
  );
}
