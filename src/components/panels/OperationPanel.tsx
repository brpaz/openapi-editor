import { memo, useCallback, useMemo } from "react";
import { useSpecStore } from "../../store/spec-store";
import { useFieldErrors } from "../../hooks/useValidation";
import FormField from "../shared/FormField";
import ArrayEditor from "../shared/ArrayEditor";
import MarkdownEditor from "../shared/MarkdownEditor";
import ExamplesEditor from "../shared/ExamplesEditor";
import { usePromptDialog } from "../shared/PromptDialog";
import SchemaEditor from "../schema/SchemaEditor";
import type { SchemaObject } from "../schema/PropertyList";
import type { oas31 } from "openapi3-ts";

interface OperationPanelProps {
  pathKey: string;
  method: string;
}

const METHOD_BG_COLORS: Record<string, string> = {
  get: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  post: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  put: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  patch: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  options:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  head: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  trace: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

type ParameterObject = {
  name?: string;
  in?: string;
  required?: boolean;
  deprecated?: boolean;
  description?: string;
  schema?: SchemaObject;
};

type ExampleRecord = Record<string, { summary?: string; description?: string; value?: unknown; externalValue?: string }>;

type ResponseEntry = {
  statusCode: string;
  description?: string;
  contentType?: string;
  schema?: SchemaObject;
  examples?: ExampleRecord;
};

function getOperation(
  spec: oas31.OpenAPIObject,
  pathKey: string,
  method: string,
): oas31.OperationObject | undefined {
  const pathItem = spec.paths?.[pathKey] as
    | Record<string, unknown>
    | undefined;
  if (!pathItem) return undefined;
  return pathItem[method] as oas31.OperationObject | undefined;
}

function getParameters(op: oas31.OperationObject): ParameterObject[] {
  if (!Array.isArray(op.parameters)) return [];
  return op.parameters.map((p) => {
    if ("$ref" in p) return {};
    return p as ParameterObject;
  });
}

function getResponses(op: oas31.OperationObject): ResponseEntry[] {
  if (!op.responses) return [];
  const entries: ResponseEntry[] = [];
  for (const [statusCode, resp] of Object.entries(op.responses)) {
    if ("$ref" in resp) {
      entries.push({ statusCode });
      continue;
    }
    const responseObj = resp as oas31.ResponseObject;
    const contentKeys = responseObj.content
      ? Object.keys(responseObj.content)
      : [];
    const contentType =
      contentKeys.includes("application/json")
        ? "application/json"
        : contentKeys.length > 0
          ? contentKeys[0]
          : undefined;
    const schema = contentType
      ? (responseObj.content?.[contentType]?.schema as SchemaObject | undefined)
      : undefined;
    const examples = contentType
      ? (responseObj.content?.[contentType]?.examples as ExampleRecord | undefined)
      : undefined;
    entries.push({
      statusCode,
      description: responseObj.description,
      contentType,
      schema,
      examples,
    });
  }
  return entries;
}

function getSpecTags(spec: oas31.OpenAPIObject): string[] {
  if (!Array.isArray(spec.tags)) return [];
  return spec.tags.map((t) => (typeof t.name === "string" ? t.name : ""));
}

function OperationPanelInner({
  pathKey,
  method,
}: OperationPanelProps) {
  const spec = useSpecStore((s) => s.spec);
  const updateField = useSpecStore((s) => s.updateField);
  const [prompt, promptDialog] = usePromptDialog();

  const basePath = useMemo(() => ["paths", pathKey, method], [pathKey, method]);
  const getFieldError = useFieldErrors(basePath);

  const handleFieldChange = useCallback(
    (field: string, value: string | number | boolean) => {
      updateField([...basePath, field], value === "" ? undefined : value);
    },
    [updateField, basePath],
  );

  const handleDescriptionChange = useCallback(
    (value: string) => {
      updateField(
        [...basePath, "description"],
        value === "" ? undefined : value,
      );
    },
    [updateField, basePath],
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

  const handleTagToggle = useCallback(
    (tagName: string, checked: boolean) => {
      if (!spec) return;
      const op = getOperation(spec, pathKey, method);
      if (!op) return;
      const current = Array.isArray(op.tags) ? [...op.tags] : [];
      if (checked && !current.includes(tagName)) {
        updateField([...basePath, "tags"], [...current, tagName]);
      } else if (!checked) {
        const filtered = current.filter((t) => t !== tagName);
        updateField(
          [...basePath, "tags"],
          filtered.length > 0 ? filtered : undefined,
        );
      }
    },
    [spec, updateField, basePath, pathKey, method],
  );

  const handleAddParameter = useCallback(() => {
    if (!spec) return;
    const op = getOperation(spec, pathKey, method);
    if (!op) return;
    const params = getParameters(op);
    const index = params.length;
    updateField([...basePath, "parameters", index.toString()], {
      name: "",
      in: "query",
    });
  }, [spec, updateField, basePath, pathKey, method]);

  const handleRemoveParameter = useCallback(
    (index: number) => {
      if (!spec) return;
      const op = getOperation(spec, pathKey, method);
      if (!op) return;
      const params = getParameters(op);
      const newParams = params.filter((_, i) => i !== index);
      updateField(
        [...basePath, "parameters"],
        newParams.length > 0 ? newParams : undefined,
      );
    },
    [spec, updateField, basePath, pathKey, method],
  );

  const handleParamFieldChange = useCallback(
    (index: number, field: string, value: string | number | boolean) => {
      updateField([...basePath, "parameters", index.toString(), field], value);
    },
    [updateField, basePath],
  );

  const handleRequestBodyFieldChange = useCallback(
    (field: string, value: string | number | boolean) => {
      updateField([...basePath, "requestBody", field], value);
    },
    [updateField, basePath],
  );

  const handleAddRequestBody = useCallback(() => {
    updateField([...basePath, "requestBody"], {
      required: false,
      content: {
        "application/json": { schema: { type: "object" } },
      },
    });
  }, [updateField, basePath]);

  const handleAddResponse = useCallback(async () => {
    const code = await prompt("Status code:", "200");
    if (!code) return;
    updateField([...basePath, "responses", code], {
      description: "",
      content: {
        "application/json": { schema: { type: "object" } },
      },
    });
  }, [updateField, basePath, prompt]);

  const handleRemoveResponse = useCallback(
    (statusCode: string) => {
      if (!spec) return;
      const op = getOperation(spec, pathKey, method);
      if (!op?.responses) return;
      const newResponses: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(op.responses)) {
        if (key !== statusCode) {
          newResponses[key] = value;
        }
      }
      updateField(
        [...basePath, "responses"],
        Object.keys(newResponses).length > 0 ? newResponses : undefined,
      );
    },
    [spec, updateField, basePath, pathKey, method],
  );

  const handleResponseDescriptionChange = useCallback(
    (statusCode: string, value: string | number | boolean) => {
      updateField(
        [...basePath, "responses", statusCode, "description"],
        value,
      );
    },
    [updateField, basePath],
  );

  if (!spec) return null;

  const operation = getOperation(spec, pathKey, method);
  if (!operation) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Operation {method.toUpperCase()} {pathKey} not found
      </div>
    );
  }

  const specTags = getSpecTags(spec);
  const operationTags = Array.isArray(operation.tags) ? operation.tags : [];
  const parameters = getParameters(operation);
  const responses = getResponses(operation);
  const hasRequestBody = operation.requestBody !== undefined;
  const requestBody = hasRequestBody
    ? (operation.requestBody as oas31.RequestBodyObject)
    : null;
  const rbContentKeys = requestBody?.content
    ? Object.keys(requestBody.content)
    : [];
  const rbContentType =
    rbContentKeys.includes("application/json")
      ? "application/json"
      : rbContentKeys.length > 0
        ? rbContentKeys[0]
        : "application/json";
  const rbSchema = requestBody?.content?.[rbContentType]?.schema as
    | SchemaObject
    | undefined;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <span
          className={`inline-block rounded px-2 py-0.5 font-mono text-xs font-bold uppercase ${METHOD_BG_COLORS[method] ?? "bg-gray-100 text-gray-800"}`}
        >
          {method}
        </span>
        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
          {pathKey}
        </span>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <FormField
            label="Summary"
            value={
              typeof operation.summary === "string" ? operation.summary : ""
            }
            onChange={(v) => handleFieldChange("summary", v)}
            placeholder="Short summary of the operation"
            error={getFieldError("summary")}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <MarkdownEditor
              value={
                typeof operation.description === "string"
                  ? operation.description
                  : ""
              }
              onChange={handleDescriptionChange}
              placeholder="Detailed operation description..."
            />
          </div>

          <FormField
            label="Operation ID"
            value={
              typeof operation.operationId === "string"
                ? operation.operationId
                : ""
            }
            onChange={(v) => handleFieldChange("operationId", v)}
            placeholder="getUsers"
            helpText="Unique identifier for the operation"
            error={getFieldError("operationId")}
          />

          <FormField
            label="Deprecated"
            value={Boolean(operation.deprecated)}
            onChange={(v) => handleFieldChange("deprecated", v)}
            type="checkbox"
          />
        </div>

        {specTags.length > 0 && (
          <fieldset className="rounded border border-gray-200 p-4 dark:border-gray-700">
            <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Tags
            </legend>
            <div className="flex flex-wrap gap-3">
              {specTags.map((tagName) => (
                <label key={tagName} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={operationTags.includes(tagName)}
                    onChange={(e) => handleTagToggle(tagName, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-blue-400"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {tagName}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="rounded border border-gray-200 p-4 dark:border-gray-700">
          <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Parameters
          </legend>
          <ArrayEditor
            items={parameters}
            onAdd={handleAddParameter}
            onRemove={handleRemoveParameter}
            addLabel="Add parameter"
            emptyLabel="No parameters"
            renderItem={(param, index) => (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <FormField
                    label="Name"
                    value={param.name ?? ""}
                    onChange={(v) =>
                      handleParamFieldChange(index, "name", v)
                    }
                    required
                    placeholder="paramName"
                    className="flex-1"
                  />
                  <FormField
                    label="In"
                    value={param.in ?? "query"}
                    onChange={(v) =>
                      handleParamFieldChange(index, "in", v)
                    }
                    type="select"
                    required
                    options={[
                      { label: "query", value: "query" },
                      { label: "path", value: "path" },
                      { label: "header", value: "header" },
                      { label: "cookie", value: "cookie" },
                    ]}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-3">
                  <FormField
                    label="Required"
                    value={Boolean(param.required)}
                    onChange={(v) =>
                      handleParamFieldChange(index, "required", v)
                    }
                    type="checkbox"
                  />
                  <FormField
                    label="Deprecated"
                    value={Boolean(param.deprecated)}
                    onChange={(v) =>
                      handleParamFieldChange(index, "deprecated", v)
                    }
                    type="checkbox"
                  />
                </div>
                <FormField
                  label="Description"
                  value={
                    typeof param.description === "string"
                      ? param.description
                      : ""
                  }
                  onChange={(v) =>
                    handleParamFieldChange(index, "description", v)
                  }
                  type="textarea"
                  placeholder="Parameter description"
                />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Schema
                  </label>
                  <SchemaEditor
                    schema={param.schema ?? {}}
                    basePath={[
                      ...basePath,
                      "parameters",
                      index.toString(),
                      "schema",
                    ]}
                    onUpdate={handleSchemaUpdate}
                  />
                </div>
              </div>
            )}
          />
        </fieldset>

        <fieldset className="rounded border border-gray-200 p-4 dark:border-gray-700">
          <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Request Body
          </legend>
          {hasRequestBody && requestBody ? (
            <div className="space-y-4">
              <FormField
                label="Required"
                value={Boolean(requestBody.required)}
                onChange={(v) =>
                  handleRequestBodyFieldChange("required", v)
                }
                type="checkbox"
              />
              <FormField
                label="Description"
                value={
                  typeof requestBody.description === "string"
                    ? requestBody.description
                    : ""
                }
                onChange={(v) =>
                  handleRequestBodyFieldChange("description", v)
                }
                type="textarea"
                placeholder="Request body description"
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Content ({rbContentType})
                </label>
                {rbSchema ? (
                  <SchemaEditor
                    schema={rbSchema}
                    basePath={[
                      ...basePath,
                      "requestBody",
                      "content",
                      rbContentType,
                      "schema",
                    ]}
                    onUpdate={handleSchemaUpdate}
                  />
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    No schema defined
                  </p>
                )}
              </div>
              <ExamplesEditor
                examples={
                  (requestBody.content?.[rbContentType]?.examples ?? {}) as ExampleRecord
                }
                basePath={[
                  ...basePath,
                  "requestBody",
                  "content",
                  rbContentType,
                  "examples",
                ]}
                onUpdate={handleSchemaUpdate}
              />
            </div>
          ) : (
            <div className="py-2">
              <button
                type="button"
                onClick={handleAddRequestBody}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                + Add request body
              </button>
            </div>
          )}
        </fieldset>

        <fieldset className="rounded border border-gray-200 p-4 dark:border-gray-700">
          <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Responses
          </legend>
          <div className="space-y-3">
            {responses.length === 0 ? (
              <p className="py-2 text-center text-sm text-gray-400 dark:text-gray-500">
                No responses defined
              </p>
            ) : (
              responses.map((resp) => (
                <div
                  key={resp.statusCode}
                  className="rounded border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs font-bold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      {resp.statusCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveResponse(resp.statusCode)}
                      className="rounded px-1 text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
                      title="Remove response"
                    >
                      ×
                    </button>
                  </div>
                  <div className="space-y-3">
                    <FormField
                      label="Description"
                      value={
                        typeof resp.description === "string"
                          ? resp.description
                          : ""
                      }
                      onChange={(v) =>
                        handleResponseDescriptionChange(resp.statusCode, v)
                      }
                      type="textarea"
                      placeholder="Response description"
                    />
                    {resp.schema && resp.contentType && (
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Schema ({resp.contentType})
                        </label>
                        <SchemaEditor
                          schema={resp.schema}
                          basePath={[
                            ...basePath,
                            "responses",
                            resp.statusCode,
                            "content",
                            resp.contentType,
                            "schema",
                          ]}
                          onUpdate={handleSchemaUpdate}
                        />
                      </div>
                    )}
                    {resp.contentType && (
                      <ExamplesEditor
                        examples={resp.examples ?? {}}
                        basePath={[
                          ...basePath,
                          "responses",
                          resp.statusCode,
                          "content",
                          resp.contentType,
                          "examples",
                        ]}
                        onUpdate={handleSchemaUpdate}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
            <button
              type="button"
              onClick={handleAddResponse}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              + Add response
            </button>
          </div>
        </fieldset>
      </div>
      {promptDialog}
    </div>
  );
}

export default memo(OperationPanelInner);
