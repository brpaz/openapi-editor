import { parseDocument, Document, LineCounter, YAMLError } from "yaml";
import type { oas31 } from "openapi3-ts";
import type { ParseOutcome } from "../types/editor";

export function parseYaml(content: string): ParseOutcome {
  const lineCounter = new LineCounter();
  let document: Document;

  try {
    document = parseDocument(content, {
      keepSourceTokens: true,
      lineCounter,
    });
  } catch (e) {
    const message =
      e instanceof YAMLError ? e.message : "Failed to parse YAML";
    return { ok: false, error: message };
  }

  const errors = document.errors;
  if (errors.length > 0) {
    return { ok: false, error: errors.map((e) => e.message).join("\n") };
  }

  const spec = document.toJSON() as oas31.OpenAPIObject;
  if (!spec || typeof spec !== "object") {
    return { ok: false, error: "YAML did not parse to an object" };
  }

  return { ok: true, result: { spec, document } };
}

export function stringifyYaml(document: Document): string {
  return document.toString();
}

export function applyEdit(
  document: Document,
  path: (string | number)[],
  value: unknown,
): void {
  document.setIn(path, value);
}

export function addToMap(
  document: Document,
  path: (string | number)[],
  key: string,
  value: unknown,
): void {
  const fullPath = [...path, key];
  document.setIn(fullPath, value);
}

export function deleteAtPath(
  document: Document,
  path: (string | number)[],
): boolean {
  return document.deleteIn(path);
}

export function getAtPath(
  document: Document,
  path: (string | number)[],
): unknown {
  return document.getIn(path, true);
}

export function documentToSpec(document: Document): oas31.OpenAPIObject {
  return document.toJSON() as oas31.OpenAPIObject;
}
