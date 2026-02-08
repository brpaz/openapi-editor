import {
  createConfig,
  lintFromString,
  type NormalizedProblem,
  type Config,
} from "@redocly/openapi-core";
import type {
  ValidationError,
  ValidationResult,
  ValidationSeverity,
} from "../types/validation";
import { pointerToPath } from "../types/editor";

let cachedConfig: Config | null = null;

async function getConfig(): Promise<Config> {
  if (!cachedConfig) {
    cachedConfig = await createConfig({
      extends: ["minimal"],
    });
  }
  return cachedConfig;
}

function severityFromRedocly(severity: "error" | "warn"): ValidationSeverity {
  return severity === "warn" ? "warning" : "error";
}

function extractPath(problem: NormalizedProblem): string[] {
  const loc = problem.location[0];
  if (!loc) return [];
  if ("pointer" in loc && loc.pointer) {
    return pointerToPath(loc.pointer);
  }
  return [];
}

function toValidationError(problem: NormalizedProblem): ValidationError {
  const loc = problem.location[0];
  const result: ValidationError = {
    message: problem.message,
    path: extractPath(problem),
    severity: severityFromRedocly(problem.severity),
    ruleId: problem.ruleId,
  };

  if (loc && "start" in loc && loc.start) {
    result.start = { line: loc.start.line, col: loc.start.col };
  }
  if (loc && "end" in loc && loc.end) {
    result.end = { line: loc.end.line, col: loc.end.col };
  }

  return result;
}

function emptyCounts(): Record<ValidationSeverity, number> {
  return { error: 0, warning: 0, info: 0 };
}

export async function validateSpec(
  yamlString: string,
): Promise<ValidationResult> {
  const config = await getConfig();
  let problems: NormalizedProblem[];

  try {
    problems = await lintFromString({
      source: yamlString,
      config,
    });
  } catch {
    return {
      errors: [
        {
          message: "Validation failed unexpectedly",
          path: [],
          severity: "error",
        },
      ],
      counts: { error: 1, warning: 0, info: 0 },
    };
  }

  const errors = problems.map(toValidationError);
  const counts = emptyCounts();
  for (const err of errors) {
    counts[err.severity]++;
  }

  return { errors, counts };
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
