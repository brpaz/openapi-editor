import { create, useStore } from "zustand";
import { temporal, type TemporalState } from "zundo";
import type { Document } from "yaml";
import type { oas31 } from "openapi3-ts";
import type { SpecState, SpecStore } from "../types/editor";
import type { ValidationResult } from "../types/validation";
import {
  parseYaml,
  stringifyYaml,
  applyEdit,
  addToMap,
  deleteAtPath,
  documentToSpec,
} from "../lib/yaml-engine";
import { validateSpecDebounced } from "../lib/validator";
import { SPEC_TEMPLATE } from "../lib/spec-template";

/** Clone a YAML Document by re-parsing its string output (preserves AST structure). */
function cloneDocument(doc: Document): Document {
  const result = parseYaml(doc.toString());
  if (!result.ok) {
    throw new Error(`Failed to clone YAML document: ${result.error}`);
  }
  return result.result.document;
}

const emptyValidation: ValidationResult = {
  errors: [],
  counts: { error: 0, warning: 0, info: 0 },
};

const initialState: SpecState = {
  spec: null,
  yamlDocument: null,
  filePath: null,
  isDirty: false,
  selectedPath: null,
  validation: emptyValidation,
};

type UndoState = {
  spec: oas31.OpenAPIObject | null;
  yamlDocument: Document | null;
  isDirty: boolean;
};

function triggerValidation(
  doc: Document | null,
  setValidation: (result: ValidationResult) => void,
): void {
  if (!doc) return;
  const yaml = stringifyYaml(doc);
  validateSpecDebounced(yaml, setValidation);
}

export const useSpecStore = create<SpecStore>()(
  temporal(
    (set, get) => ({
      ...initialState,

      openFile: async (path: string, content: string) => {
        const outcome = parseYaml(content);
        if (!outcome.ok) {
          throw new Error(`Failed to parse YAML: ${outcome.error}`);
        }

        const spec = outcome.result.spec;
        if (!spec.openapi || !String(spec.openapi).startsWith("3.1")) {
          const raw = outcome.result.document.toJSON() as Record<string, unknown>;
          const version = spec.openapi ?? raw["swagger"] ?? "unknown";
          throw new Error(
            `Not a valid OpenAPI 3.1 specification. Detected version: ${version}`,
          );
        }

        set({
          spec,
          yamlDocument: outcome.result.document,
          filePath: path,
          isDirty: false,
          selectedPath: null,
          validation: emptyValidation,
        });

        triggerValidation(outcome.result.document, get().setValidation);
      },

      newSpec: () => {
        const outcome = parseYaml(SPEC_TEMPLATE);
        if (!outcome.ok) {
          throw new Error(`Invalid spec template: ${outcome.error}`);
        }

        set({
          spec: outcome.result.spec,
          yamlDocument: outcome.result.document,
          filePath: null,
          isDirty: false,
          selectedPath: null,
          validation: emptyValidation,
        });

        triggerValidation(outcome.result.document, get().setValidation);
      },

      save: () => {
        const { yamlDocument } = get();
        if (!yamlDocument) return null;
        return stringifyYaml(yamlDocument);
      },

      getYamlString: () => {
        const { yamlDocument } = get();
        if (!yamlDocument) return null;
        return stringifyYaml(yamlDocument);
      },

      updateField: (path: string[], value: unknown) => {
        const { spec, yamlDocument } = get();
        if (!spec || !yamlDocument) return;

        const newDoc = cloneDocument(yamlDocument);
        applyEdit(newDoc, path, value);
        const newSpec = documentToSpec(newDoc);

        set({
          spec: newSpec,
          yamlDocument: newDoc,
          isDirty: true,
        });

        triggerValidation(newDoc, get().setValidation);
      },

      addElement: (path: string[], key: string, value: unknown) => {
        const { spec, yamlDocument } = get();
        if (!spec || !yamlDocument) return;

        const newDoc = cloneDocument(yamlDocument);
        addToMap(newDoc, path, key, value);
        const newSpec = documentToSpec(newDoc);

        set({
          spec: newSpec,
          yamlDocument: newDoc,
          isDirty: true,
        });

        triggerValidation(newDoc, get().setValidation);
      },

      removeElement: (path: string[]) => {
        const { spec, yamlDocument } = get();
        if (!spec || !yamlDocument) return;

        const newDoc = cloneDocument(yamlDocument);
        const deleted = deleteAtPath(newDoc, path);
        if (!deleted) return;

        const newSpec = documentToSpec(newDoc);

        set({
          spec: newSpec,
          yamlDocument: newDoc,
          isDirty: true,
        });

        triggerValidation(newDoc, get().setValidation);
      },

      setSelectedPath: (path: string[] | null) => {
        set({ selectedPath: path });
      },

      setValidation: (result: ValidationResult) => {
        set({ validation: result });
      },

      markClean: () => {
        set({ isDirty: false });
      },

      reset: () => {
        set({ ...initialState });
      },
    }),
    {
      partialize: (state): UndoState => ({
        spec: state.spec,
        yamlDocument: state.yamlDocument,
        isDirty: state.isDirty,
      }),
      equality: (pastState, currentState) =>
        pastState.spec === currentState.spec,
    },
  ),
);

export const useTemporalStore = <T>(
  selector: (state: TemporalState<UndoState>) => T,
): T => useStore(useSpecStore.temporal, selector);
