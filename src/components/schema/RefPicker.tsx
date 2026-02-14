import { useCallback } from "react";
import { useSpecStore } from "../../store/spec-store";

interface RefPickerProps {
  value: string;
  onChange: (ref: string) => void;
  section?: "schemas" | "responses" | "parameters" | "requestBodies" | "examples";
  className?: string;
}

function getRefOptions(
  spec: unknown,
  section: string,
): string[] {
  if (!spec || typeof spec !== "object") return [];
  const specObj = spec as Record<string, unknown>;
  const components = specObj.components as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!components) return [];
  const sectionObj = components[section];
  if (!sectionObj || typeof sectionObj !== "object") return [];
  return Object.keys(sectionObj).sort();
}

export default function RefPicker({
  value,
  onChange,
  section = "schemas",
  className,
}: RefPickerProps) {
  const spec = useSpecStore((s) => s.spec);

  const names = getRefOptions(spec, section);
  const prefix = `#/components/${section}/`;
  const currentName = value.startsWith(prefix)
    ? value.slice(prefix.length)
    : "";

  const handleChange = useCallback(
    (name: string) => {
      if (name) {
        onChange(`${prefix}${name}`);
      } else {
        onChange("");
      }
    },
    [onChange, prefix],
  );

  const options = [
    { label: "(none)", value: "" },
    ...names.map((name) => ({ label: name, value: name })),
  ];

  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        $ref ({section})
      </label>
      <select
        value={currentName}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {value && (
        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
          {value}
        </p>
      )}
    </div>
  );
}
