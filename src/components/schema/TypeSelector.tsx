import FormField from "../shared/FormField";

const SCHEMA_TYPES = [
  { label: "(none)", value: "" },
  { label: "string", value: "string" },
  { label: "number", value: "number" },
  { label: "integer", value: "integer" },
  { label: "boolean", value: "boolean" },
  { label: "array", value: "array" },
  { label: "object", value: "object" },
  { label: "null", value: "null" },
] as const;

interface TypeSelectorProps {
  value: string;
  onChange: (type: string) => void;
  className?: string;
}

export default function TypeSelector({
  value,
  onChange,
  className,
}: TypeSelectorProps) {
  return (
    <FormField
      label="Type"
      value={value}
      onChange={(v) => onChange(String(v))}
      type="select"
      options={[...SCHEMA_TYPES]}
      className={className}
    />
  );
}
