import { useAppStore } from "../../store/app-store";

export default function ErrorBanner() {
  const error = useAppStore((s) => s.error);
  const setError = useAppStore((s) => s.setError);

  if (!error) return null;

  return (
    <div className="flex items-center gap-2 border-b border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
      <span className="shrink-0">●</span>
      <span className="flex-1 truncate">{error}</span>
      <button
        type="button"
        onClick={() => setError(null)}
        className="shrink-0 rounded px-2 py-0.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900"
      >
        Dismiss
      </button>
    </div>
  );
}
