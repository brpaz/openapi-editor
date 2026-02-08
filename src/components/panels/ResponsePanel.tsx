import { memo, useCallback } from "react";
import { useSpecStore } from "../../store/spec-store";
import { useFieldErrors } from "../../hooks/useValidation";
import FormField from "../shared/FormField";
import KeyValueEditor from "../shared/KeyValueEditor";
import SchemaEditor from "../schema/SchemaEditor";
import type { SchemaObject } from "../schema/PropertyList";
import type { oas31 } from "openapi3-ts";

interface ResponsePanelProps {
  name: string;
}

function getHeadersAsStrings(
  headers: Record<string, oas31.HeaderObject | oas31.ReferenceObject> | undefined,
): Record<string, string> {
  if (!headers) return {};
  const result: Record<string, string> = {};
  for (const [key, header] of Object.entries(headers)) {
    if ("$ref" in header) {
      result[key] = "";
    } else {
      result[key] = typeof header.description === "string" ? header.description : "";
    }
  }
  return result;
}

function getFirstContentType(
  content: Record<string, oas31.MediaTypeObject> | undefined,
): string {
  if (!content) return "application/json";
  const keys = Object.keys(content);
  if (keys.includes("application/json")) return "application/json";
  return keys.length > 0 ? keys[0] : "application/json";
}

function ResponsePanelInner({ name }: ResponsePanelProps) {
  const spec = useSpecStore((s) => s.spec);
  const updateField = useSpecStore((s) => s.updateField);
  const getFieldError = useFieldErrors(["components", "responses", name]);

  const handleDescriptionChange = useCallback(
    (value: string | number | boolean) => {
      updateField(["components", "responses", name, "description"], value);
    },
    [updateField, name],
  );

  const handleHeadersChange = useCallback(
    (entries: Record<string, string>) => {
      const headers: Record<string, oas31.HeaderObject | oas31.ReferenceObject> = {};
      for (const [key, value] of Object.entries(entries)) {
        headers[key] = { description: value };
      }
      updateField(["components", "responses", name, "headers"], headers);
    },
    [updateField, name],
  );

  const handleContentTypeChange = useCallback(
    (newContentType: string, oldContentType: string) => {
      if (!spec?.components?.responses?.[name]) return;
      const response = spec.components.responses[name] as oas31.ResponseObject;
      const content = response.content;
      if (!content) return;

      const oldContent = content[oldContentType];
      if (!oldContent) return;

      const newContent: Record<string, oas31.MediaTypeObject> = {};
      for (const [key, value] of Object.entries(content)) {
        if (key !== oldContentType) {
          newContent[key] = value;
        }
      }
      newContent[newContentType] = oldContent;

      updateField(["components", "responses", name, "content"], newContent);
    },
    [spec, updateField, name],
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

  const response = spec.components?.responses?.[name] as
    | oas31.ResponseObject
    | undefined;

  if (!response) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Response &ldquo;{name}&rdquo; not found
      </div>
    );
  }

  const headers = getHeadersAsStrings(response.headers);
  const contentType = getFirstContentType(response.content);
  const schema = response.content?.[contentType]?.schema as
    | SchemaObject
    | undefined;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Response: {name}
      </h2>

      <div className="space-y-4">
        <FormField
          label="Description"
          value={response.description ?? ""}
          onChange={handleDescriptionChange}
          type="textarea"
          required
          placeholder="Response description"
          error={getFieldError("description")}
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Headers
          </label>
          <KeyValueEditor
            entries={headers}
            onChange={handleHeadersChange}
            keyLabel="Header Name"
            valueLabel="Description"
            addLabel="Add header"
          />
        </div>

        {schema && (
          <fieldset className="rounded border border-gray-200 p-4 dark:border-gray-700">
            <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Content
            </legend>
            <div className="space-y-4">
              <FormField
                label="Content Type"
                value={contentType}
                onChange={(v) => handleContentTypeChange(String(v), contentType)}
                placeholder="application/json"
              />
              <SchemaEditor
                schema={schema}
                basePath={[
                  "components",
                  "responses",
                  name,
                  "content",
                  contentType,
                  "schema",
                ]}
                onUpdate={handleSchemaUpdate}
              />
            </div>
          </fieldset>
        )}
      </div>
    </div>
  );
}

export default memo(ResponsePanelInner);
