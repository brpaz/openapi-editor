import type { Document } from "yaml";
import type { oas31 } from "openapi3-ts";
import type { ValidationError, ValidationResult } from "./validation";

export interface SpecState {
  spec: oas31.OpenAPIObject | null;
  yamlDocument: Document | null;
  filePath: string | null;
  isDirty: boolean;
  selectedPath: string[] | null;
  validation: ValidationResult;
}

export interface SpecActions {
  openFile: (path: string, content: string) => Promise<void>;
  newSpec: () => void;
  save: () => string | null;
  getYamlString: () => string | null;
  updateField: (path: string[], value: unknown) => void;
  addElement: (path: string[], key: string, value: unknown) => void;
  removeElement: (path: string[]) => void;
  setSelectedPath: (path: string[] | null) => void;
  setValidation: (result: ValidationResult) => void;
  markClean: () => void;
  reset: () => void;
}

export type SpecStore = SpecState & SpecActions;

export const YAML_EXTENSIONS = ["yaml", "yml"] as const;

export const YAML_FILE_FILTER = {
  name: "YAML",
  extensions: [...YAML_EXTENSIONS],
} as const;

export interface ParseResult {
  spec: oas31.OpenAPIObject;
  document: Document;
}

export type ParseOutcome =
  | { ok: true; result: ParseResult }
  | { ok: false; error: string };

export type ValidationErrorMap = Map<string, ValidationError[]>;

// RFC 6901 JSON Pointer encoding: ~ -> ~0, / -> ~1
export function pathToPointer(path: string[]): string {
  if (path.length === 0) return "";
  return (
    "/" +
    path
      .map((segment) => segment.replace(/~/g, "~0").replace(/\//g, "~1"))
      .join("/")
  );
}

// RFC 6901 JSON Pointer decoding: ~1 -> /, ~0 -> ~
export function pointerToPath(pointer: string): string[] {
  if (!pointer || pointer === "") return [];
  return pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}
