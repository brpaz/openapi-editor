import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { useSpecStore } from "../../store/spec-store";
import { useTemporalStore } from "../../store/spec-store";
import { getCurrentWindow } from "@tauri-apps/api/window";
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

interface MenuItemDef {
  label: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  separator?: false;
}

interface MenuSeparatorDef {
  separator: true;
}

type MenuEntry = MenuItemDef | MenuSeparatorDef;

interface MenuDropdownProps {
  label: string;
  items: MenuEntry[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function MenuDropdown({ label, items, isOpen, onToggle, onClose }: MenuDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={onToggle}
        className={`rounded px-3 py-1 text-sm ${
          isOpen
            ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
            : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
        }`}
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-0.5 min-w-52 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
          {items.map((item, i) => {
            if (item.separator) {
              return (
                <div
                  key={`sep-${i}`}
                  className="my-1 border-t border-gray-200 dark:border-gray-700"
                />
              );
            }
            const menuItem = item;
            return (
              <button
                key={menuItem.label}
                type="button"
                disabled={menuItem.disabled}
                onClick={() => {
                  if (!menuItem.disabled) {
                    menuItem.action();
                    onClose();
                  }
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:hover:bg-transparent"
              >
                <span>{menuItem.label}</span>
                {menuItem.shortcut && (
                  <span className="ml-6 text-xs text-gray-400 dark:text-gray-500">
                    {menuItem.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Toolbar() {
  const spec = useSpecStore((s) => s.spec);
  const { resolvedTheme, toggleTheme } = useTheme();
  const pastStates = useTemporalStore((s) => s.pastStates);
  const futureStates = useTemporalStore((s) => s.futureStates);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const hasSpec = spec !== null;

  const closeMenu = useCallback(() => setOpenMenu(null), []);

  const toggleMenu = useCallback(
    (name: string) => {
      setOpenMenu((prev) => (prev === name ? null : name));
    },
    [],
  );

  useEffect(() => {
    if (!openMenu) return;
    function handleClick(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenu]);

  const fileItems: MenuEntry[] = [
    { label: "New", shortcut: "Ctrl+N", action: () => void newSpecAction() },
    { label: "Open", shortcut: "Ctrl+O", action: () => void openFileAction() },
    { separator: true },
    { label: "Save", shortcut: "Ctrl+S", action: () => void saveFileAction(), disabled: !hasSpec },
    { label: "Save As", shortcut: "Ctrl+Shift+S", action: () => void saveAsAction(), disabled: !hasSpec },
    { separator: true },
    { label: "Copy to Clipboard", action: () => void copyToClipboardAction(), disabled: !hasSpec },
    { label: "Paste from Clipboard", action: () => void pasteFromClipboardAction() },
    { separator: true },
    { label: "Exit", action: () => void getCurrentWindow().close() },
  ];

  const editItems: MenuEntry[] = [
    { label: "Undo", shortcut: "Ctrl+Z", action: undoAction, disabled: pastStates.length === 0 },
    { label: "Redo", shortcut: "Ctrl+Shift+Z", action: redoAction, disabled: futureStates.length === 0 },
  ];

  const viewItems: MenuEntry[] = [
    {
      label: resolvedTheme === "dark" ? "Light Mode" : "Dark Mode",
      action: toggleTheme,
    },
  ];

  return (
    <div
      ref={toolbarRef}
      className="flex h-10 select-none items-center gap-0.5 border-b border-gray-200 bg-gray-100 px-2 dark:border-gray-700 dark:bg-gray-800"
    >
      <MenuDropdown
        label="File"
        items={fileItems}
        isOpen={openMenu === "file"}
        onToggle={() => toggleMenu("file")}
        onClose={closeMenu}
      />
      <MenuDropdown
        label="Edit"
        items={editItems}
        isOpen={openMenu === "edit"}
        onToggle={() => toggleMenu("edit")}
        onClose={closeMenu}
      />
      <MenuDropdown
        label="View"
        items={viewItems}
        isOpen={openMenu === "view"}
        onToggle={() => toggleMenu("view")}
        onClose={closeMenu}
      />
    </div>
  );
}
