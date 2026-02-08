import { useId } from "react";

interface FormFieldProps {
  label: string;
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
  type?:
    | "text"
    | "textarea"
    | "select"
    | "checkbox"
    | "number"
    | "url"
    | "email";
  placeholder?: string;
  options?: { label: string; value: string }[];
  error?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const INPUT_BASE =
  "w-full rounded border px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 dark:text-gray-100 dark:placeholder:text-gray-500";

const INPUT_NORMAL =
  "border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:focus:border-blue-400 dark:focus:ring-blue-400";

const INPUT_ERROR =
  "border-red-500 bg-white focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:bg-gray-800 dark:focus:border-red-400 dark:focus:ring-red-400";

export default function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  options,
  error,
  helpText,
  required,
  disabled,
  className,
}: FormFieldProps) {
  const id = useId();
  const inputClasses = `${INPUT_BASE} ${error ? INPUT_ERROR : INPUT_NORMAL}`;

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    if (type === "checkbox") {
      onChange((e.target as HTMLInputElement).checked);
    } else if (type === "number") {
      const num = Number(e.target.value);
      onChange(Number.isNaN(num) ? e.target.value : num);
    } else {
      onChange(e.target.value);
    }
  }

  if (type === "checkbox") {
    return (
      <div className={`flex items-center gap-2 ${className ?? ""}`}>
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={handleChange}
          disabled={disabled}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-blue-400"
        />
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {error && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      {type === "textarea" ? (
        <textarea
          id={id}
          value={String(value ?? "")}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className={`${inputClasses} resize-y`}
        />
      ) : type === "select" ? (
        <select
          id={id}
          value={String(value ?? "")}
          onChange={handleChange}
          disabled={disabled}
          className={inputClasses}
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={type}
          value={String(value ?? "")}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
        />
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {helpText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
    </div>
  );
}
