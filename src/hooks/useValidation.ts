import { useCallback, useMemo } from "react";
import { useSpecStore } from "../store/spec-store";
import type { ValidationError } from "../types/validation";

function pathMatches(
  errorPath: string[],
  basePath: string[],
  field: string,
): boolean {
  if (errorPath.length < basePath.length + 1) return false;
  for (let i = 0; i < basePath.length; i++) {
    if (errorPath[i] !== basePath[i]) return false;
  }
  return errorPath[basePath.length] === field;
}

function pathStartsWith(
  errorPath: string[],
  basePath: string[],
): boolean {
  if (errorPath.length < basePath.length) return false;
  for (let i = 0; i < basePath.length; i++) {
    if (errorPath[i] !== basePath[i]) return false;
  }
  return true;
}

export function useFieldErrors(basePath: string[]): (field: string) => string | undefined {
  const errors = useSpecStore((s) => s.validation.errors);
  const basePathKey = basePath.join("/");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableBasePath = useMemo(() => basePath, [basePathKey]);

  return useCallback(
    (field: string): string | undefined => {
      const match = errors.find((e) => pathMatches(e.path, stableBasePath, field));
      return match?.message;
    },
    [errors, stableBasePath],
  );
}

export function usePathErrors(basePath: string[]): ValidationError[] {
  const errors = useSpecStore((s) => s.validation.errors);
  const basePathKey = basePath.join("/");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableBasePath = useMemo(() => basePath, [basePathKey]);

  return useMemo(
    () => errors.filter((e) => pathStartsWith(e.path, stableBasePath)),
    [errors, stableBasePath],
  );
}
