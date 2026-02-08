import { describe, it, expect } from "vitest";
import type { oas31 } from "openapi3-ts";
import { resolveRefs, bundleRefs } from "./ref-resolver";

describe("resolveRefs", () => {
  it("should return ok true for simple spec without refs", async () => {
    const simpleSpec = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
    } as oas31.OpenAPIObject;

    const result = await resolveRefs(simpleSpec);

    expect(result.ok).toBe(true);
    expect(result).toHaveProperty("spec");
  });

  it("should return cloned spec, not same reference", async () => {
    const simpleSpec = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
    } as oas31.OpenAPIObject;

    const result = await resolveRefs(simpleSpec);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.spec).not.toBe(simpleSpec);
    }
  });

  it("should return error for spec with non-existent internal ref", async () => {
    const specWithBadRef = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
      components: {
        schemas: {
          User: {
            $ref: "#/components/schemas/NonExistent",
          },
        },
      },
    } as oas31.OpenAPIObject;

    const result = await resolveRefs(specWithBadRef);

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty("error");
    if (!result.ok) {
      expect(typeof result.error).toBe("string");
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});

describe("bundleRefs", () => {
  it("should return ok true for simple spec without refs", async () => {
    const simpleSpec = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
    } as oas31.OpenAPIObject;

    const result = await bundleRefs(simpleSpec);

    expect(result.ok).toBe(true);
    expect(result).toHaveProperty("spec");
  });

  it("should return cloned spec, not same reference", async () => {
    const simpleSpec = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
    } as oas31.OpenAPIObject;

    const result = await bundleRefs(simpleSpec);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.spec).not.toBe(simpleSpec);
    }
  });

  it("should return error for spec with non-existent internal ref", async () => {
    const specWithBadRef = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
      components: {
        schemas: {
          User: {
            $ref: "#/components/schemas/NonExistent",
          },
        },
      },
    } as oas31.OpenAPIObject;

    const result = await bundleRefs(specWithBadRef);

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty("error");
    if (!result.ok) {
      expect(typeof result.error).toBe("string");
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});
