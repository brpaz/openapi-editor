export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationLocation {
  /** 1-based */
  line: number;
  /** 1-based */
  col: number;
}

export interface ValidationError {
  message: string;
  /** JSON path segments, e.g. ["paths", "/users", "get", "summary"] */
  path: string[];
  severity: ValidationSeverity;
  start?: ValidationLocation;
  end?: ValidationLocation;
  ruleId?: string;
}

export interface ValidationResult {
  errors: ValidationError[];
  counts: Record<ValidationSeverity, number>;
}
