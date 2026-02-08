import SwaggerParser from "@apidevtools/swagger-parser";
import type { oas31 } from "openapi3-ts";
import type { OpenAPI } from "openapi-types";

export type ResolveResult =
  | { ok: true; spec: oas31.OpenAPIObject }
  | { ok: false; error: string };

export async function resolveRefs(
  spec: oas31.OpenAPIObject,
): Promise<ResolveResult> {
  try {
    const cloned = structuredClone(spec);
    const resolved = await SwaggerParser.dereference(
      cloned as unknown as OpenAPI.Document,
    );
    return { ok: true, spec: resolved as unknown as oas31.OpenAPIObject };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to resolve $refs";
    return { ok: false, error: message };
  }
}

export async function bundleRefs(
  spec: oas31.OpenAPIObject,
): Promise<ResolveResult> {
  try {
    const cloned = structuredClone(spec);
    const bundled = await SwaggerParser.bundle(
      cloned as unknown as OpenAPI.Document,
    );
    return { ok: true, spec: bundled as unknown as oas31.OpenAPIObject };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to bundle $refs";
    return { ok: false, error: message };
  }
}
