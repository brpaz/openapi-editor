import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useSpecStore } from "../store/spec-store";

const UNSAVED_MESSAGE =
  "You have unsaved changes. Are you sure you want to close?";

export function useCloseHandler(): void {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWindow()
      .onCloseRequested(async (event) => {
        const isDirty = useSpecStore.getState().isDirty;
        if (!isDirty) return;

        const confirmed = await confirm(UNSAVED_MESSAGE, {
          title: "Unsaved Changes",
          kind: "warning",
          okLabel: "Discard & Close",
          cancelLabel: "Cancel",
        });

        if (!confirmed) {
          event.preventDefault();
        }
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});

    return () => {
      unlisten?.();
    };
  }, []);
}

export async function confirmUnsavedChanges(): Promise<boolean> {
  const isDirty = useSpecStore.getState().isDirty;
  if (!isDirty) return true;

  return confirm(UNSAVED_MESSAGE, {
    title: "Unsaved Changes",
    kind: "warning",
    okLabel: "Discard Changes",
    cancelLabel: "Cancel",
  });
}
