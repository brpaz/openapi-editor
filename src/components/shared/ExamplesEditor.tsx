import { useCallback, useState } from "react";
import { stringify, parse } from "yaml";
import FormField from "./FormField";
import { usePromptDialog } from "./PromptDialog";
import RefPicker from "../schema/RefPicker";

interface ExampleObject {
  summary?: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
}

type ExampleOrRef = ExampleObject | { $ref: string };

interface ExamplesEditorProps {
  examples: Record<string, ExampleOrRef>;
  basePath: string[];
  onUpdate: (path: string[], value: unknown) => void;
}

function serializeValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  try {
    return stringify(value, { indent: 2 }).trimEnd();
  } catch {
    return String(value);
  }
}

function parseValue(yamlString: string): unknown {
  if (yamlString.trim() === "") return undefined;
  try {
    return parse(yamlString);
  } catch {
    return yamlString;
  }
}

function ExampleItem({
  name,
  example,
  basePath,
  onUpdate,
  onRemove,
  onRename,
}: {
  name: string;
  example: ExampleOrRef;
  basePath: string[];
  onUpdate: (path: string[], value: unknown) => void;
  onRemove: () => void;
  onRename: (newName: string) => void;
}) {
  const isRef = "$ref" in example;
  const [expanded, setExpanded] = useState(true);
  const [mode, setMode] = useState<"inline" | "ref">(isRef ? "ref" : "inline");
  const exampleObj = isRef ? ({} as ExampleObject) : example;
  const [valueText, setValueText] = useState(() =>
    isRef ? "" : serializeValue(exampleObj.value),
  );
  const [nameInput, setNameInput] = useState(name);
  const [editing, setEditing] = useState(false);
  const useExternalValue = !isRef && exampleObj.externalValue !== undefined;

  const handleSummaryChange = useCallback(
    (v: string | number | boolean) => {
      onUpdate(
        [...basePath, name, "summary"],
        v === "" ? undefined : v,
      );
    },
    [basePath, name, onUpdate],
  );

  const handleDescriptionChange = useCallback(
    (v: string | number | boolean) => {
      onUpdate(
        [...basePath, name, "description"],
        v === "" ? undefined : v,
      );
    },
    [basePath, name, onUpdate],
  );

  const handleValueBlur = useCallback(() => {
    const parsed = parseValue(valueText);
    onUpdate([...basePath, name, "value"], parsed);
  }, [basePath, name, onUpdate, valueText]);

  const handleExternalValueChange = useCallback(
    (v: string | number | boolean) => {
      onUpdate(
        [...basePath, name, "externalValue"],
        v === "" ? undefined : v,
      );
    },
    [basePath, name, onUpdate],
  );

  const handleToggleMode = useCallback(() => {
    if (useExternalValue) {
      onUpdate([...basePath, name, "externalValue"], undefined);
      onUpdate([...basePath, name, "value"], {});
      setValueText("{}");
    } else {
      onUpdate([...basePath, name, "value"], undefined);
      onUpdate([...basePath, name, "externalValue"], "");
      setValueText("");
    }
  }, [basePath, name, onUpdate, useExternalValue]);

  const handleModeChange = useCallback(
    (newMode: "inline" | "ref") => {
      if (newMode === "ref") {
        onUpdate([...basePath, name], { $ref: "" });
      } else {
        onUpdate([...basePath, name], {
          summary: "",
          value: {},
        });
        setValueText("{}");
      }
      setMode(newMode);
    },
    [basePath, name, onUpdate],
  );

  const handleRefChange = useCallback(
    (ref: string) => {
      if (ref) {
        onUpdate([...basePath, name], { $ref: ref });
      } else {
        onUpdate([...basePath, name], {
          summary: "",
          value: {},
        });
        setValueText("{}");
        setMode("inline");
      }
    },
    [basePath, name, onUpdate],
  );

  const handleNameSubmit = useCallback(() => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    } else {
      setNameInput(name);
    }
    setEditing(false);
  }, [name, nameInput, onRename]);

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <span className="text-xs text-gray-400">
            {expanded ? "▼" : "▶"}
          </span>
          {editing ? (
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSubmit();
                if (e.key === "Escape") {
                  setNameInput(name);
                  setEditing(false);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded border border-blue-400 bg-white px-1 py-0 text-sm focus:outline-none dark:bg-gray-800"
              autoFocus
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              title="Double-click to rename"
            >
              {name}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded px-1 text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
          title="Remove example"
        >
          ×
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 p-3">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2 dark:border-gray-700">
            <button
              type="button"
              onClick={() => handleModeChange("inline")}
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
              onClick={() => handleModeChange("ref")}
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
              value={"$ref" in example ? example.$ref : ""}
              onChange={handleRefChange}
              section="examples"
            />
          ) : (
            <>
              <FormField
                label="Summary"
                value={typeof exampleObj.summary === "string" ? exampleObj.summary : ""}
                onChange={handleSummaryChange}
                placeholder="Short description of the example"
              />

              <FormField
                label="Description"
                value={
                  typeof exampleObj.description === "string"
                    ? exampleObj.description
                    : ""
                }
                onChange={handleDescriptionChange}
                type="textarea"
                placeholder="Detailed description"
              />

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Source:
                </label>
                <button
                  type="button"
                  onClick={handleToggleMode}
                  className={`rounded-l px-2 py-0.5 text-xs font-medium ${
                    !useExternalValue
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                  }`}
                >
                  Inline Value
                </button>
                <button
                  type="button"
                  onClick={handleToggleMode}
                  className={`rounded-r px-2 py-0.5 text-xs font-medium ${
                    useExternalValue
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                  }`}
                >
                  External URL
                </button>
              </div>

              {useExternalValue ? (
                <FormField
                  label="External Value URL"
                  value={
                    typeof exampleObj.externalValue === "string"
                      ? exampleObj.externalValue
                      : ""
                  }
                  onChange={handleExternalValueChange}
                  type="url"
                  placeholder="https://example.com/example.json"
                />
              ) : (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Value (YAML)
                  </label>
                  <textarea
                    value={valueText}
                    onChange={(e) => setValueText(e.target.value)}
                    onBlur={handleValueBlur}
                    rows={6}
                    spellCheck={false}
                    className="w-full resize-y rounded border border-gray-300 bg-white px-3 py-1.5 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                    placeholder={"id: 1\nname: Fido\nstatus: available"}
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Enter example payload as YAML. Saved on blur.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExamplesEditor({
  examples,
  basePath,
  onUpdate,
}: ExamplesEditorProps) {
  const exampleNames = Object.keys(examples);
  const [prompt, promptDialog] = usePromptDialog();

  const handleAdd = useCallback(async () => {
    const name = await prompt("Example name:");
    if (!name) return;
    onUpdate([...basePath, name], {
      summary: "",
      value: {},
    });
  }, [basePath, onUpdate, prompt]);

  const handleRemove = useCallback(
    (name: string) => {
      const updated: Record<string, ExampleOrRef> = {};
      for (const [key, value] of Object.entries(examples)) {
        if (key !== name) {
          updated[key] = value;
        }
      }
      onUpdate(
        basePath,
        Object.keys(updated).length > 0 ? updated : undefined,
      );
    },
    [basePath, examples, onUpdate],
  );

  const handleRename = useCallback(
    (oldName: string, newName: string) => {
      const updated: Record<string, ExampleOrRef> = {};
      for (const [key, value] of Object.entries(examples)) {
        if (key === oldName) {
          updated[newName] = value;
        } else {
          updated[key] = value;
        }
      }
      onUpdate(basePath, updated);
    },
    [basePath, examples, onUpdate],
  );

  return (
    <div className="space-y-2">
      {exampleNames.length === 0 ? (
        <p className="py-2 text-center text-sm text-gray-400 dark:text-gray-500">
          No examples defined
        </p>
      ) : (
        exampleNames.map((name) => (
          <ExampleItem
            key={name}
            name={name}
            example={examples[name]}
            basePath={basePath}
            onUpdate={onUpdate}
            onRemove={() => handleRemove(name)}
            onRename={(newName) => handleRename(name, newName)}
          />
        ))
      )}
      <button
        type="button"
        onClick={handleAdd}
        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        + Add example
      </button>
      {promptDialog}
    </div>
  );
}
