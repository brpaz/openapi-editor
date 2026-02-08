import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useSpecStore } from "../spec-store";
import { useAppStore } from "../app-store";
import { saveRecentFiles, type RecentFileEntry } from "../../lib/recent-files";
import { YAML_EXTENSIONS } from "../../types/editor";
import { confirmUnsavedChanges } from "../../hooks/useCloseHandler";

export async function openFileAction(): Promise<void> {
  const canProceed = await confirmUnsavedChanges();
  if (!canProceed) return;

  const selected = await open({
    multiple: false,
    filters: [{ name: "YAML", extensions: [...YAML_EXTENSIONS] }],
  });
  if (!selected) return;

  const path = selected as string;
  try {
    useAppStore.getState().setLoading(true);
    useAppStore.getState().setError(null);
    const content = await readTextFile(path);
    await useSpecStore.getState().openFile(path, content);
    useAppStore.getState().addRecentFile(path);
    persistRecentFiles();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to open file";
    useAppStore.getState().setError(message);
  } finally {
    useAppStore.getState().setLoading(false);
  }
}

export async function openRecentFileAction(path: string): Promise<void> {
  const canProceed = await confirmUnsavedChanges();
  if (!canProceed) return;

  try {
    useAppStore.getState().setLoading(true);
    useAppStore.getState().setError(null);
    const content = await readTextFile(path);
    await useSpecStore.getState().openFile(path, content);
    useAppStore.getState().addRecentFile(path);
    persistRecentFiles();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to open file";
    useAppStore.getState().setError(message);
  } finally {
    useAppStore.getState().setLoading(false);
  }
}

export async function saveFileAction(): Promise<boolean> {
  const { filePath } = useSpecStore.getState();
  const yamlString = useSpecStore.getState().save();
  if (!yamlString) return false;

  if (!filePath) {
    return saveAsAction();
  }

  await writeTextFile(filePath, yamlString);
  useSpecStore.getState().markClean();
  return true;
}

export async function saveAsAction(): Promise<boolean> {
  const yamlString = useSpecStore.getState().save();
  if (!yamlString) return false;

  const path = await save({
    filters: [{ name: "YAML", extensions: [...YAML_EXTENSIONS] }],
    defaultPath: useSpecStore.getState().filePath ?? undefined,
  });
  if (!path) return false;

  await writeTextFile(path, yamlString);
  useSpecStore.getState().markClean();
  useAppStore.getState().addRecentFile(path);
  persistRecentFiles();
  return true;
}

export async function newSpecAction(): Promise<void> {
  const canProceed = await confirmUnsavedChanges();
  if (!canProceed) return;
  useSpecStore.getState().newSpec();
}

export async function copyToClipboardAction(): Promise<void> {
  const yamlString = useSpecStore.getState().getYamlString();
  if (!yamlString) return;
  await writeText(yamlString);
}

export async function pasteFromClipboardAction(): Promise<void> {
  const canProceed = await confirmUnsavedChanges();
  if (!canProceed) return;

  try {
    useAppStore.getState().setError(null);
    const text = await readText();
    if (!text) return;
    await useSpecStore.getState().openFile("", text);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to parse clipboard content";
    useAppStore.getState().setError(message);
  }
}

export function undoAction(): void {
  useSpecStore.temporal.getState().undo();
}

export function redoAction(): void {
  useSpecStore.temporal.getState().redo();
}

function persistRecentFiles(): void {
  const entries: RecentFileEntry[] = useAppStore
    .getState()
    .recentFiles.map((f) => ({ path: f.path, openedAt: f.openedAt }));
  saveRecentFiles(entries).catch(() => {});
}
