import { useCallback, useState } from "react";
import FormField from "../shared/FormField";

interface SchemaObject {
  type?: string | string[];
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  additionalProperties?: boolean | SchemaObject;
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  allOf?: SchemaObject[];
  $ref?: string;
  description?: string;
  example?: unknown;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  nullable?: boolean;
  format?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: unknown[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  [key: string]: unknown;
}

interface PropertyListProps {
  properties: Record<string, SchemaObject>;
  requiredList: string[];
  basePath: string[];
  onUpdate: (path: string[], value: unknown) => void;
  onRemoveProperty: (propertyName: string) => void;
  renderSchemaEditor: (
    schema: SchemaObject,
    path: string[],
    depth: number,
  ) => React.ReactNode;
  depth?: number;
}

export default function PropertyList({
  properties,
  requiredList,
  basePath,
  onUpdate,
  onRemoveProperty,
  renderSchemaEditor,
  depth = 0,
}: PropertyListProps) {
  const [newPropName, setNewPropName] = useState("");
  const propertyNames = Object.keys(properties);

  const handleAddProperty = useCallback(() => {
    const name = newPropName.trim();
    if (!name || name in properties) return;
    onUpdate([...basePath, "properties", name], { type: "string" });
    setNewPropName("");
  }, [newPropName, properties, basePath, onUpdate]);

  const handleToggleRequired = useCallback(
    (propertyName: string, isRequired: boolean) => {
      const newRequired = isRequired
        ? [...requiredList, propertyName]
        : requiredList.filter((r) => r !== propertyName);

      if (newRequired.length > 0) {
        onUpdate([...basePath, "required"], newRequired);
      } else {
        onUpdate([...basePath, "required"], undefined);
      }
    },
    [requiredList, basePath, onUpdate],
  );

  return (
    <div className="space-y-2">
      {propertyNames.length === 0 ? (
        <p className="py-2 text-center text-sm text-gray-400 dark:text-gray-500">
          No properties
        </p>
      ) : (
        propertyNames.map((name) => {
          const propSchema = properties[name] ?? {};
          const isRequired = requiredList.includes(name);
          const propPath = [...basePath, "properties", name];

          return (
            <div
              key={name}
              className="rounded border border-gray-200 p-3 dark:border-gray-700"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {name}
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={isRequired}
                      onChange={(e) =>
                        handleToggleRequired(name, e.target.checked)
                      }
                      className="h-3 w-3 rounded border-gray-300 text-blue-600 dark:border-gray-600"
                    />
                    required
                  </label>
                  <button
                    type="button"
                    onClick={() => onRemoveProperty(name)}
                    className="rounded px-1 text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
                    title="Remove property"
                  >
                    ×
                  </button>
                </div>
              </div>
              {renderSchemaEditor(propSchema, propPath, depth + 1)}
            </div>
          );
        })
      )}

      <div className="flex items-center gap-2">
        <FormField
          label=""
          value={newPropName}
          onChange={(v) => setNewPropName(String(v))}
          placeholder="New property name"
          className="flex-1"
        />
        <button
          type="button"
          onClick={handleAddProperty}
          disabled={!newPropName.trim() || newPropName.trim() in properties}
          className="mt-1 rounded px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-400 dark:hover:text-blue-300"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

export type { SchemaObject };
