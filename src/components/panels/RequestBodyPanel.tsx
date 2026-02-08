import { memo, useCallback, useState } from "react";
import { useSpecStore } from "../../store/spec-store";
import { useFieldErrors } from "../../hooks/useValidation";
import FormField from "../shared/FormField";
import SchemaEditor from "../schema/SchemaEditor";
import type { SchemaObject } from "../schema/PropertyList";
import type { oas31 } from "openapi3-ts";

interface RequestBodyPanelProps {
  name: string;
}

function getFirstContentType(
  content: Record<string, oas31.MediaTypeObject> | undefined,
): string {
  if (!content) return "application/json";
  const keys = Object.keys(content);
  if (keys.includes("application/json")) return "application/json";
  return keys.length > 0 ? keys[0] : "application/json";
}

function RequestBodyPanelInner({ name }: RequestBodyPanelProps) {
  const spec = useSpecStore((s) => s.spec);
  const updateField = useSpecStore((s) => s.updateField);
  const getFieldError = useFieldErrors(["components", "requestBodies", name]);

  const requestBody = spec?.components?.requestBodies?.[name] as
    | oas31.RequestBodyObject
    | undefined;

  const [contentType, setContentType] = useState<string>(
    getFirstContentType(requestBody?.content),
  );

  const handleDescriptionChange = useCallback(
    (value: string | number | boolean) => {
      updateField(
        ["components", "requestBodies", name, "description"],
        value,
      );
    },
    [updateField, name],
  );

  const handleRequiredChange = useCallback(
    (value: string | number | boolean) => {
      updateField(
        ["components", "requestBodies", name, "required"],
        Boolean(value),
      );
    },
    [updateField, name],
  );

  const handleContentTypeChange = useCallback(
    (newContentType: string) => {
      if (!spec?.components?.requestBodies?.[name]) return;
      const body = spec.components.requestBodies[name] as oas31.RequestBodyObject;
      const content = body.content;
      if (!content) return;

      const oldContent = content[contentType];
      if (!oldContent) return;

      const newContent: Record<string, oas31.MediaTypeObject> = {};
      for (const [key, value] of Object.entries(content)) {
        if (key !== contentType) {
          newContent[key] = value;
        }
      }
      newContent[newContentType] = oldContent;

      updateField(["components", "requestBodies", name, "content"], newContent);
      setContentType(newContentType);
    },
    [spec, updateField, name, contentType],
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

  if (!requestBody) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Request body &ldquo;{name}&rdquo; not found
      </div>
    );
  }

  const schema = requestBody.content?.[contentType]?.schema as
    | SchemaObject
    | undefined;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Request Body: {name}
      </h2>

      <div className="space-y-4">
        <FormField
          label="Description"
          value={requestBody.description ?? ""}
          onChange={handleDescriptionChange}
          type="textarea"
          placeholder="Request body description"
          error={getFieldError("description")}
        />

        <FormField
          label="Required"
          value={Boolean(requestBody.required)}
          onChange={handleRequiredChange}
          type="checkbox"
        />

        {schema && (
          <fieldset className="rounded border border-gray-200 p-4 dark:border-gray-700">
            <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Content
            </legend>
            <div className="space-y-4">
              <FormField
                label="Content Type"
                value={contentType}
                onChange={(v) => handleContentTypeChange(String(v))}
                placeholder="application/json"
              />
              <SchemaEditor
                schema={schema}
                basePath={[
                  "components",
                  "requestBodies",
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

export default memo(RequestBodyPanelInner);
