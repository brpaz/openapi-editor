import { useTheme } from "../../hooks/useTheme";
import { useSpecStore } from "../../store/spec-store";
import { useTemporalStore } from "../../store/spec-store";
import {
  openFileAction,
  saveFileAction,
  saveAsAction,
  newSpecAction,
  copyToClipboardAction,
  pasteFromClipboardAction,
  undoAction,
  redoAction,
} from "../../store/actions/file-actions";

function Divider() {
  return <div className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" />;
}

interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function ToolbarButton({ label, onClick, disabled }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700"
    >
      {label}
    </button>
  );
}

export default function Toolbar() {
  const spec = useSpecStore((s) => s.spec);
  const { resolvedTheme, toggleTheme } = useTheme();
  const pastStates = useTemporalStore((s) => s.pastStates);
  const futureStates = useTemporalStore((s) => s.futureStates);

  const hasSpec = spec !== null;

  return (
    <div className="flex h-10 select-none items-center gap-0.5 border-b border-gray-200 bg-gray-100 px-2 dark:border-gray-700 dark:bg-gray-800">
      <ToolbarButton label="New" onClick={() => void newSpecAction()} />
      <ToolbarButton label="Open" onClick={() => void openFileAction()} />
      <ToolbarButton label="Save" onClick={() => void saveFileAction()} disabled={!hasSpec} />
      <ToolbarButton label="Save As" onClick={() => void saveAsAction()} disabled={!hasSpec} />
      <Divider />
      <ToolbarButton label="Copy" onClick={() => void copyToClipboardAction()} disabled={!hasSpec} />
      <ToolbarButton label="Paste" onClick={() => void pasteFromClipboardAction()} />
      <Divider />
      <ToolbarButton label="Undo" onClick={undoAction} disabled={pastStates.length === 0} />
      <ToolbarButton label="Redo" onClick={redoAction} disabled={futureStates.length === 0} />
      <div className="flex-1" />
      <ToolbarButton
        label={resolvedTheme === "dark" ? "Light" : "Dark"}
        onClick={toggleTheme}
      />
    </div>
  );
}
