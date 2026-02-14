import { useCallback, useState, useEffect } from "react";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { dirname, resolve } from "@tauri-apps/api/path";
import FormField from "./FormField";
import { usePromptDialog } from "./PromptDialog";
import { useSpecStore } from "../../store/spec-store";

interface CodeSampleObject {
  lang: string;
  label?: string;
  source?: string | { $ref: string };
}

export type CodeSampleOrRef = CodeSampleObject | { $ref: string };

interface CodeSamplesEditorProps {
  codeSamples: CodeSampleOrRef[];
  basePath: string[];
  onUpdate: (path: string[], value: unknown) => void;
}

function CodeSampleItem({
  index,
  codeSample,
  basePath,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  index: number;
  codeSample: CodeSampleOrRef;
  basePath: string[];
  onUpdate: (path: string[], value: unknown) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const isRootRef = "$ref" in codeSample && !("lang" in codeSample);
  const sourceIsRef = !isRootRef && "source" in codeSample && typeof codeSample.source === "object" && codeSample.source !== null && "$ref" in codeSample.source;
  const [expanded, setExpanded] = useState(true);
  const [mode, setMode] = useState<"inline" | "ref">(sourceIsRef ? "ref" : "inline");
  
  const lang = isRootRef ? "" : ("lang" in codeSample ? codeSample.lang : "");
  const label = isRootRef ? "" : ("label" in codeSample ? codeSample.label : "");
  const source = isRootRef ? "" : ("source" in codeSample ? codeSample.source : "");
  
  const sourceString = typeof source === "string" ? source : "";
  const sourceRef = sourceIsRef && typeof source === "object" ? source.$ref : "";
  
  const [sourceText, setSourceText] = useState(sourceString);
  const [refPath, setRefPath] = useState(sourceRef);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const filePath = useSpecStore((state) => state.filePath);

  useEffect(() => {
    if (mode === "ref" && refPath && filePath) {
      setIsLoadingPreview(true);
      setPreviewError(null);

      (async () => {
        try {
          const baseDir = await dirname(filePath);
          const absolutePath = await resolve(baseDir, refPath);
          const content = await readTextFile(absolutePath);
          setPreviewContent(content);
          setPreviewError(null);
        } catch (err) {
          setPreviewContent(null);
          setPreviewError(err instanceof Error ? err.message : "Failed to load file");
        } finally {
          setIsLoadingPreview(false);
        }
      })();
    } else {
      setPreviewContent(null);
      setPreviewError(null);
      setIsLoadingPreview(false);
    }
  }, [mode, refPath, filePath]);

  const handleFieldChange = useCallback(
    (field: string, value: string | number | boolean) => {
      onUpdate([...basePath, index.toString(), field], value === "" ? undefined : value);
    },
    [basePath, index, onUpdate],
  );

  const handleSourceBlur = useCallback(() => {
    onUpdate([...basePath, index.toString(), "source"], sourceText || undefined);
  }, [basePath, index, onUpdate, sourceText]);

  const handleModeChange = useCallback(
    (newMode: "inline" | "ref") => {
      if (newMode === "ref") {
        onUpdate([...basePath, index.toString(), "source"], { $ref: "" });
        setRefPath("");
      } else {
        onUpdate([...basePath, index.toString(), "source"], "");
        setSourceText("");
      }
      setMode(newMode);
    },
    [basePath, index, onUpdate],
  );

  const handleRefChange = useCallback(
    (value: string | number | boolean) => {
      const stringValue = String(value);
      setRefPath(stringValue);
      onUpdate([...basePath, index.toString(), "source"], stringValue ? { $ref: stringValue } : undefined);
    },
    [basePath, index, onUpdate],
  );

  const displayLabel = lang
    ? `${lang}${label ? ` - ${label}` : ""}`
    : `Code Sample #${index + 1}`;

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
          <span>{displayLabel}</span>
          {mode === "ref" && (
            <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              external file
            </span>
          )}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="rounded px-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title="Move up"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="rounded px-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title="Move down"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded px-1 text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
            title="Remove code sample"
          >
            ×
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 p-3">
          <FormField
            label="Language"
            value={lang}
            onChange={(v) => handleFieldChange("lang", v)}
            placeholder="javascript, python, curl, php, etc."
            required
          />

          <FormField
            label="Label"
            value={label || ""}
            onChange={(v) => handleFieldChange("label", v)}
            placeholder="Optional display label (e.g., Node.js, Python 3.9)"
          />

          <div className="space-y-2">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2 dark:border-gray-700">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Source:
              </label>
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
                External File ($ref)
              </button>
            </div>

            {mode === "ref" ? (
              <div className="space-y-2">
                <FormField
                  label="File Path"
                  value={refPath}
                  onChange={handleRefChange}
                  placeholder="../code_samples/javascript/pets/get.js"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Relative path to external code sample file (e.g., ../code_samples/PHP/customers/post.php)
                </p>
                
                {isLoadingPreview && (
                  <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                    Loading preview...
                  </div>
                )}
                
                {previewError && (
                  <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                    <strong>Error:</strong> {previewError}
                  </div>
                )}
                
                {previewContent && !isLoadingPreview && !previewError && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Preview:
                    </label>
                    <div className="max-h-60 overflow-auto rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                      <pre className="font-mono text-xs text-gray-800 dark:text-gray-200">
                        {previewContent}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  onBlur={handleSourceBlur}
                  rows={10}
                  spellCheck={false}
                  className="w-full resize-y rounded border border-gray-300 bg-white px-3 py-1.5 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                  placeholder={
                    "const response = await fetch('/api/pets');\nconst data = await response.json();\nconsole.log(data);"
                  }
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Enter inline code sample. Saved on blur.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CodeSamplesEditor({
  codeSamples,
  basePath,
  onUpdate,
}: CodeSamplesEditorProps) {
  const [prompt, promptDialog] = usePromptDialog();
  const samplesArray = Array.isArray(codeSamples) ? codeSamples : [];

  const handleAdd = useCallback(async () => {
    const lang = await prompt("Enter language (e.g., javascript, python, curl):");
    if (!lang) return;
    const newSamples = [
      ...samplesArray,
      {
        lang,
        label: "",
        source: "",
      },
    ];
    onUpdate(basePath, newSamples);
  }, [basePath, onUpdate, prompt, samplesArray]);

  const handleRemove = useCallback(
    (index: number) => {
      const newSamples = samplesArray.filter((_, i) => i !== index);
      onUpdate(basePath, newSamples.length > 0 ? newSamples : undefined);
    },
    [basePath, onUpdate, samplesArray],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const newSamples = [...samplesArray];
      [newSamples[index - 1], newSamples[index]] = [
        newSamples[index],
        newSamples[index - 1],
      ];
      onUpdate(basePath, newSamples);
    },
    [basePath, onUpdate, samplesArray],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === samplesArray.length - 1) return;
      const newSamples = [...samplesArray];
      [newSamples[index], newSamples[index + 1]] = [
        newSamples[index + 1],
        newSamples[index],
      ];
      onUpdate(basePath, newSamples);
    },
    [basePath, onUpdate, samplesArray],
  );

  const handleUpdate = useCallback(
    (path: string[], value: unknown) => {
      onUpdate(path, value);
    },
    [onUpdate],
  );

  return (
    <div className="space-y-2">
      {samplesArray.length === 0 ? (
        <p className="py-2 text-center text-sm text-gray-400 dark:text-gray-500">
          No code samples defined. Add one to get started.
        </p>
      ) : (
        samplesArray.map((sample, index) => (
          <CodeSampleItem
            key={index}
            index={index}
            codeSample={sample}
            basePath={basePath}
            onUpdate={handleUpdate}
            onRemove={() => handleRemove(index)}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            canMoveUp={index > 0}
            canMoveDown={index < samplesArray.length - 1}
          />
        ))
      )}
      <button
        type="button"
        onClick={handleAdd}
        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        + Add code sample
      </button>
      {promptDialog}
    </div>
  );
}
