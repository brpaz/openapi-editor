import { useState, useCallback } from "react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

type Tab = "write" | "preview";

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>("write");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className={className}>
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab("write")}
          className={`px-3 py-1.5 text-sm font-medium ${
            activeTab === "write"
              ? "border-b-2 border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`px-3 py-1.5 text-sm font-medium ${
            activeTab === "preview"
              ? "border-b-2 border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Preview
        </button>
      </div>

      {activeTab === "write" ? (
        <textarea
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          className="mt-1 w-full resize-y rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
        />
      ) : (
        <div className="mt-1 min-h-[6rem] rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
          {value ? (
            <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
              {value}
            </pre>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Nothing to preview
            </p>
          )}
        </div>
      )}
    </div>
  );
}
