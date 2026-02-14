import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPI } from "openapi-types";
import { parseDocument } from "yaml";
import type {
  ValidationError,
  ValidationResult,
  ValidationSeverity,
} from "../types/validation";
import { pointerToPath } from "../types/editor";

interface AjvDetail {
  instancePath?: string;
  message?: string;
}

function emptyCounts(): Record<ValidationSeverity, number> {
  return { error: 0, warning: 0, info: 0 };
}

export async function validateSpec(
  yamlString: string,
): Promise<ValidationResult> {
  let spec: Record<string, unknown>;

  try {
    const doc = parseDocument(yamlString);
    if (doc.errors.length > 0) {
      return {
        errors: doc.errors.map((e) => ({
          message: e.message,
          path: [],
          severity: "error" as const,
        })),
        counts: { error: doc.errors.length, warning: 0, info: 0 },
      };
    }
    spec = doc.toJSON() as Record<string, unknown>;
    if (!spec || typeof spec !== "object") {
      return {
        errors: [{ message: "YAML did not parse to an object", path: [], severity: "error" }],
        counts: { error: 1, warning: 0, info: 0 },
      };
    }
  } catch {
    return {
      errors: [{ message: "Failed to parse YAML", path: [], severity: "error" }],
      counts: { error: 1, warning: 0, info: 0 },
    };
  }

  try {
    await SwaggerParser.validate(structuredClone(spec) as OpenAPI.Document);
    return { errors: [], counts: emptyCounts() };
  } catch (err: unknown) {
    const errors: ValidationError[] = [];

    if (err && typeof err === "object" && "details" in err) {
      const details = (err as { details: AjvDetail[] }).details;
      if (Array.isArray(details)) {
        for (const detail of details) {
          errors.push({
            message: detail.message ?? "Validation error",
            path: pointerToPath(detail.instancePath ?? ""),
            severity: "error",
          });
        }
      }
    }

    if (errors.length === 0) {
      const message = err instanceof Error ? err.message : "Validation failed";
      errors.push({ message, path: [], severity: "error" });
    }

    const counts = emptyCounts();
    for (const e of errors) {
      counts[e.severity]++;
    }

    return { errors, counts };
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function validateSpecDebounced(
  yamlString: string,
  onResult: (result: ValidationResult) => void,
  delayMs = 300,
): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(async () => {
    const result = await validateSpec(yamlString);
    onResult(result);
  }, delayMs);
}
