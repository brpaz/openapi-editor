import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface PromptState {
  title: string;
  defaultValue: string;
  resolve: (value: string | null) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
function PromptDialog({ state, onClose }: { state: PromptState; onClose: () => void }) {
  const [value, setValue] = useState(state.defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    state.resolve(trimmed || null);
    onClose();
  }, [value, state, onClose]);

  const handleCancel = useCallback(() => {
    state.resolve(null);
    onClose();
  }, [state, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSubmit, handleCancel],
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
          {state.title}
        </p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function usePromptDialog(): [
  (title: string, defaultValue?: string) => Promise<string | null>,
  React.ReactNode,
] {
  const [state, setState] = useState<PromptState | null>(null);

  const prompt = useCallback(
    (title: string, defaultValue = ""): Promise<string | null> => {
      return new Promise((resolve) => {
        setState({ title, defaultValue, resolve });
      });
    },
    [],
  );

  const dialog = state ? (
    <PromptDialog state={state} onClose={() => setState(null)} />
  ) : null;

  return [prompt, dialog];
}
