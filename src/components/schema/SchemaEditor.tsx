import { useState, useCallback } from "react";
import FormField from "../shared/FormField";
import TypeSelector from "./TypeSelector";
import PropertyList from "./PropertyList";
import CompositionEditor from "./CompositionEditor";
import RefPicker from "./RefPicker";
import type { SchemaObject } from "./PropertyList";

interface SchemaEditorProps {
  schema: SchemaObject;
  basePath: string[];
  onUpdate: (path: string[], value: unknown) => void;
  depth?: number;
  maxDepth?: number;
}

function getSchemaType(schema: SchemaObject): string {
  if (typeof schema.type === "string") return schema.type;
  if (Array.isArray(schema.type)) {
    const filtered = schema.type.filter((t: string) => t !== "null");
    return filtered.length > 0 ? String(filtered[0]) : "";
  }
  return "";
}

function isNullable(schema: SchemaObject): boolean {
  if (Array.isArray(schema.type)) {
    return schema.type.includes("null");
  }
  return false;
}

const MAX_DEPTH = 6;

export default function SchemaEditor({
  schema,
  basePath,
  onUpdate,
  depth = 0,
  maxDepth = MAX_DEPTH,
}: SchemaEditorProps) {
  const [mode, setMode] = useState<"inline" | "ref">(
    schema.$ref ? "ref" : "inline",
  );

  const schemaType = getSchemaType(schema);
  const nullable = isNullable(schema);

  const handleTypeChange = useCallback(
    (newType: string) => {
      if (nullable && newType) {
        onUpdate([...basePath, "type"], [newType, "null"]);
      } else if (newType) {
        onUpdate([...basePath, "type"], newType);
      } else {
        onUpdate([...basePath, "type"], undefined);
      }
    },
    [basePath, onUpdate, nullable],
  );

  const handleNullableChange = useCallback(
    (isNullable: boolean) => {
      if (!schemaType) return;
      if (isNullable) {
        onUpdate([...basePath, "type"], [schemaType, "null"]);
      } else {
        onUpdate([...basePath, "type"], schemaType);
      }
    },
    [basePath, onUpdate, schemaType],
  );

  const handleFieldChange = useCallback(
    (field: string, value: unknown) => {
      onUpdate([...basePath, field], value === "" ? undefined : value);
    },
    [basePath, onUpdate],
  );

  const handleRefChange = useCallback(
    (ref: string) => {
      if (ref) {
        onUpdate(basePath, { $ref: ref });
      } else {
        onUpdate(basePath, { type: "object" });
        setMode("inline");
      }
    },
    [basePath, onUpdate],
  );

  const handleRemoveProperty = useCallback(
    (propertyName: string) => {
      onUpdate([...basePath, "properties", propertyName], undefined);
      const currentRequired = (schema.required ?? []) as string[];
      const newRequired = currentRequired.filter((r) => r !== propertyName);
      if (newRequired.length > 0) {
        onUpdate([...basePath, "required"], newRequired);
      } else {
        onUpdate([...basePath, "required"], undefined);
      }
    },
    [basePath, onUpdate, schema.required],
  );

  const renderSchemaEditor = useCallback(
    (childSchema: SchemaObject, childPath: string[], childDepth: number) => (
      <SchemaEditor
        schema={childSchema}
        basePath={childPath}
        onUpdate={onUpdate}
        depth={childDepth}
        maxDepth={maxDepth}
      />
    ),
    [onUpdate, maxDepth],
  );

  if (depth >= maxDepth) {
    return (
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Max nesting depth reached
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("inline")}
          className={`text-xs font-medium ${
            mode === "inline"
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          }`}
        >
          Inline
        </button>
        <span className="text-xs text-gray-300 dark:text-gray-600">|</span>
        <button
          type="button"
          onClick={() => setMode("ref")}
          className={`text-xs font-medium ${
            mode === "ref"
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          }`}
        >
          $ref
        </button>
      </div>

      {mode === "ref" ? (
        <RefPicker
          value={schema.$ref ?? ""}
          onChange={handleRefChange}
          section="schemas"
        />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <TypeSelector value={schemaType} onChange={handleTypeChange} />
            </div>
            {schemaType && (
              <FormField
                label="Nullable"
                value={nullable}
                onChange={(v) => handleNullableChange(Boolean(v))}
                type="checkbox"
                className="mt-5"
              />
            )}
          </div>

          <FormField
            label="Description"
            value={
              typeof schema.description === "string" ? schema.description : ""
            }
            onChange={(v) => handleFieldChange("description", v)}
            type="textarea"
            placeholder="Schema description"
          />

          {renderTypeSpecificFields(
            schemaType,
            schema,
            basePath,
            handleFieldChange,
          )}

          <div className="flex gap-3">
            <FormField
              label="Deprecated"
              value={Boolean(schema.deprecated)}
              onChange={(v) => handleFieldChange("deprecated", v)}
              type="checkbox"
            />
            <FormField
              label="Read Only"
              value={Boolean(schema.readOnly)}
              onChange={(v) => handleFieldChange("readOnly", v)}
              type="checkbox"
            />
            <FormField
              label="Write Only"
              value={Boolean(schema.writeOnly)}
              onChange={(v) => handleFieldChange("writeOnly", v)}
              type="checkbox"
            />
          </div>

          {schemaType === "object" && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Properties
              </label>
              <PropertyList
                properties={
                  (schema.properties as Record<string, SchemaObject>) ?? {}
                }
                requiredList={(schema.required as string[]) ?? []}
                basePath={basePath}
                onUpdate={onUpdate}
                onRemoveProperty={handleRemoveProperty}
                renderSchemaEditor={renderSchemaEditor}
                depth={depth}
              />
            </div>
          )}

          {schemaType === "array" && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Items Schema
              </label>
              <div className="rounded border border-gray-200 p-3 dark:border-gray-700">
                {renderSchemaEditor(
                  (schema.items as SchemaObject) ?? {},
                  [...basePath, "items"],
                  depth + 1,
                )}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Composition
            </label>
            <CompositionEditor
              schema={schema}
              basePath={basePath}
              onUpdate={onUpdate}
              renderSchemaEditor={renderSchemaEditor}
              depth={depth}
            />
          </div>

          <FormField
            label="Example"
            value={
              schema.example !== undefined ? String(schema.example) : ""
            }
            onChange={(v) => handleFieldChange("example", v)}
            placeholder="Example value"
          />
        </>
      )}
    </div>
  );
}

function renderTypeSpecificFields(
  type: string,
  schema: SchemaObject,
  _basePath: string[],
  handleFieldChange: (field: string, value: unknown) => void,
) {
  switch (type) {
    case "string":
      return (
        <div className="space-y-3">
          <FormField
            label="Format"
            value={typeof schema.format === "string" ? schema.format : ""}
            onChange={(v) => handleFieldChange("format", v)}
            type="select"
            options={[
              { label: "(none)", value: "" },
              { label: "date-time", value: "date-time" },
              { label: "date", value: "date" },
              { label: "time", value: "time" },
              { label: "email", value: "email" },
              { label: "hostname", value: "hostname" },
              { label: "ipv4", value: "ipv4" },
              { label: "ipv6", value: "ipv6" },
              { label: "uri", value: "uri" },
              { label: "uuid", value: "uuid" },
              { label: "binary", value: "binary" },
              { label: "byte", value: "byte" },
              { label: "password", value: "password" },
            ]}
          />
          <div className="flex gap-3">
            <FormField
              label="Min Length"
              value={schema.minLength ?? ""}
              onChange={(v) => handleFieldChange("minLength", v)}
              type="number"
              className="flex-1"
            />
            <FormField
              label="Max Length"
              value={schema.maxLength ?? ""}
              onChange={(v) => handleFieldChange("maxLength", v)}
              type="number"
              className="flex-1"
            />
          </div>
          <FormField
            label="Pattern"
            value={typeof schema.pattern === "string" ? schema.pattern : ""}
            onChange={(v) => handleFieldChange("pattern", v)}
            placeholder="Regex pattern"
          />
          <FormField
            label="Enum (comma-separated)"
            value={Array.isArray(schema.enum) ? schema.enum.join(", ") : ""}
            onChange={(v) => {
              const str = String(v).trim();
              if (str) {
                handleFieldChange(
                  "enum",
                  str.split(",").map((s) => s.trim()),
                );
              } else {
                handleFieldChange("enum", undefined);
              }
            }}
            placeholder="value1, value2, value3"
          />
          <FormField
            label="Default"
            value={
              schema.default !== undefined ? String(schema.default) : ""
            }
            onChange={(v) => handleFieldChange("default", v)}
            placeholder="Default value"
          />
        </div>
      );

    case "number":
    case "integer":
      return (
        <div className="space-y-3">
          <FormField
            label="Format"
            value={typeof schema.format === "string" ? schema.format : ""}
            onChange={(v) => handleFieldChange("format", v)}
            type="select"
            options={[
              { label: "(none)", value: "" },
              { label: "int32", value: "int32" },
              { label: "int64", value: "int64" },
              { label: "float", value: "float" },
              { label: "double", value: "double" },
            ]}
          />
          <div className="flex gap-3">
            <FormField
              label="Minimum"
              value={schema.minimum ?? ""}
              onChange={(v) => handleFieldChange("minimum", v)}
              type="number"
              className="flex-1"
            />
            <FormField
              label="Maximum"
              value={schema.maximum ?? ""}
              onChange={(v) => handleFieldChange("maximum", v)}
              type="number"
              className="flex-1"
            />
          </div>
          <div className="flex gap-3">
            <FormField
              label="Excl. Min"
              value={schema.exclusiveMinimum ?? ""}
              onChange={(v) => handleFieldChange("exclusiveMinimum", v)}
              type="number"
              className="flex-1"
            />
            <FormField
              label="Excl. Max"
              value={schema.exclusiveMaximum ?? ""}
              onChange={(v) => handleFieldChange("exclusiveMaximum", v)}
              type="number"
              className="flex-1"
            />
          </div>
          <FormField
            label="Multiple Of"
            value={schema.multipleOf ?? ""}
            onChange={(v) => handleFieldChange("multipleOf", v)}
            type="number"
          />
          <FormField
            label="Enum (comma-separated)"
            value={Array.isArray(schema.enum) ? schema.enum.join(", ") : ""}
            onChange={(v) => {
              const str = String(v).trim();
              if (str) {
                handleFieldChange(
                  "enum",
                  str.split(",").map((s) => Number(s.trim())),
                );
              } else {
                handleFieldChange("enum", undefined);
              }
            }}
            placeholder="1, 2, 3"
          />
          <FormField
            label="Default"
            value={
              schema.default !== undefined ? String(schema.default) : ""
            }
            onChange={(v) => handleFieldChange("default", v)}
            type="number"
          />
        </div>
      );

    case "boolean":
      return (
        <FormField
          label="Default"
          value={
            schema.default !== undefined ? String(schema.default) : ""
          }
          onChange={(v) => handleFieldChange("default", v)}
          type="select"
          options={[
            { label: "(none)", value: "" },
            { label: "true", value: "true" },
            { label: "false", value: "false" },
          ]}
        />
      );

    case "array":
      return (
        <div className="space-y-3">
          <div className="flex gap-3">
            <FormField
              label="Min Items"
              value={schema.minItems ?? ""}
              onChange={(v) => handleFieldChange("minItems", v)}
              type="number"
              className="flex-1"
            />
            <FormField
              label="Max Items"
              value={schema.maxItems ?? ""}
              onChange={(v) => handleFieldChange("maxItems", v)}
              type="number"
              className="flex-1"
            />
          </div>
          <FormField
            label="Unique Items"
            value={Boolean(schema.uniqueItems)}
            onChange={(v) => handleFieldChange("uniqueItems", v)}
            type="checkbox"
          />
        </div>
      );

    default:
      return null;
  }
}
