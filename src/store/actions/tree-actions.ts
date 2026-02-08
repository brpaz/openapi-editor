import { useSpecStore } from "../spec-store";
import type { HttpMethod } from "../../types/tree";

export function addPathAction(pathString: string): void {
  const store = useSpecStore.getState();
  if (!store.spec) return;

  const cleanPath = pathString.startsWith("/") ? pathString : `/${pathString}`;
  store.addElement(["paths"], cleanPath, {});
  store.setSelectedPath(["paths", cleanPath]);
}

export function addOperationAction(
  pathString: string,
  method: HttpMethod,
): void {
  const store = useSpecStore.getState();
  if (!store.spec) return;

  store.addElement(["paths", pathString], method, {
    summary: "",
    responses: {},
  });
  store.setSelectedPath(["paths", pathString, method]);
}

export function addSchemaAction(name: string): void {
  const store = useSpecStore.getState();
  if (!store.spec) return;

  ensureComponents();
  store.addElement(["components", "schemas"], name, { type: "object" });
  store.setSelectedPath(["components", "schemas", name]);
}

export function addResponseAction(name: string): void {
  const store = useSpecStore.getState();
  if (!store.spec) return;

  ensureComponents();
  store.addElement(["components", "responses"], name, { description: "" });
  store.setSelectedPath(["components", "responses", name]);
}

export function addParameterAction(name: string): void {
  const store = useSpecStore.getState();
  if (!store.spec) return;

  ensureComponents();
  store.addElement(["components", "parameters"], name, {
    name,
    in: "query",
  });
  store.setSelectedPath(["components", "parameters", name]);
}

export function addRequestBodyAction(name: string): void {
  const store = useSpecStore.getState();
  if (!store.spec) return;

  ensureComponents();
  store.addElement(["components", "requestBodies"], name, {
    content: {},
  });
  store.setSelectedPath(["components", "requestBodies", name]);
}

export function addServerAction(): void {
  const store = useSpecStore.getState();
  if (!store.spec) return;

  const servers = store.spec.servers ?? [];
  const index = servers.length;
  store.updateField(["servers", index.toString()], {
    url: "https://api.example.com",
  });
  store.setSelectedPath(["servers", index.toString()]);
}

export function addTagAction(name: string): void {
  const store = useSpecStore.getState();
  if (!store.spec) return;

  const tags = store.spec.tags ?? [];
  const index = tags.length;
  store.updateField(["tags", index.toString()], { name });
  store.setSelectedPath(["tags", index.toString()]);
}

export function deleteNodeAction(path: string[]): void {
  const store = useSpecStore.getState();
  if (!store.spec) return;

  store.removeElement(path);

  const { selectedPath } = store;
  if (
    selectedPath &&
    selectedPath.length >= path.length &&
    path.every((seg, i) => selectedPath[i] === seg)
  ) {
    store.setSelectedPath(null);
  }
}

function ensureComponents(): void {
  const store = useSpecStore.getState();
  if (!store.spec) return;

  if (!store.spec.components) {
    store.updateField(["components"], {});
  }
}
