import { useEffect } from "react";
import {
  openFileAction,
  saveFileAction,
  saveAsAction,
  newSpecAction,
  undoAction,
  redoAction,
} from "../store/actions/file-actions";

interface ShortcutEntry {
  key: string;
  ctrlOrMeta: boolean;
  shift: boolean;
  action: () => void;
}

const shortcuts: ShortcutEntry[] = [
  { key: "s", ctrlOrMeta: true, shift: false, action: () => void saveFileAction() },
  { key: "s", ctrlOrMeta: true, shift: true, action: () => void saveAsAction() },
  { key: "o", ctrlOrMeta: true, shift: false, action: () => void openFileAction() },
  { key: "n", ctrlOrMeta: true, shift: false, action: () => void newSpecAction() },
  { key: "z", ctrlOrMeta: true, shift: false, action: undoAction },
  { key: "z", ctrlOrMeta: true, shift: true, action: redoAction },
];

function matchesShortcut(e: KeyboardEvent, shortcut: ShortcutEntry): boolean {
  const ctrlOrMeta = e.ctrlKey || e.metaKey;
  return (
    e.key.toLowerCase() === shortcut.key &&
    ctrlOrMeta === shortcut.ctrlOrMeta &&
    e.shiftKey === shortcut.shift
  );
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      for (const shortcut of shortcuts) {
        if (matchesShortcut(e, shortcut)) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
