import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSpecStore } from "../store/spec-store";

const APP_NAME = "OpenAPI Editor";

function extractFileName(filePath: string): string {
  const segments = filePath.split(/[/\\]/);
  return segments[segments.length - 1] || filePath;
}

function buildTitle(filePath: string | null, isDirty: boolean): string {
  if (!filePath) {
    const prefix = isDirty ? "● " : "";
    return `${prefix}Untitled — ${APP_NAME}`;
  }

  const name = extractFileName(filePath);
  const prefix = isDirty ? "● " : "";
  return `${prefix}${name} — ${APP_NAME}`;
}

export function useWindowTitle(): void {
  const filePath = useSpecStore((s) => s.filePath);
  const isDirty = useSpecStore((s) => s.isDirty);
  const spec = useSpecStore((s) => s.spec);

  useEffect(() => {
    if (!spec) {
      getCurrentWindow().setTitle(APP_NAME).catch(() => {});
      return;
    }

    const title = buildTitle(filePath, isDirty);
    getCurrentWindow().setTitle(title).catch(() => {});
  }, [filePath, isDirty, spec]);
}
