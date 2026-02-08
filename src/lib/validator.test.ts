import { describe, it, expect } from "vitest";
import { validateSpec } from "./validator";

describe("validateSpec", () => {
  it("should return no errors for valid spec", async () => {
    const validSpec = `openapi: 3.1.0
info:
  title: Test
  version: 1.0.0
paths: {}`;

    const result = await validateSpec(validSpec);

    expect(result.counts.error).toBe(0);
  });

  it("should return errors for spec with missing info field", async () => {
    const invalidSpec = `openapi: 3.1.0
paths: {}`;

    const result = await validateSpec(invalidSpec);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.counts.error).toBeGreaterThan(0);

    const firstError = result.errors[0];
    expect(firstError).toHaveProperty("message");
    expect(firstError).toHaveProperty("severity");
    expect(firstError).toHaveProperty("path");
    expect(firstError.severity).toBe("error");
  });

  it("should return error for completely invalid YAML", async () => {
    const invalidYaml = `{invalid yaml: [`;

    const result = await validateSpec(invalidYaml);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.counts.error).toBeGreaterThan(0);
  });

  it("should have counts that match errors array length", async () => {
    const validSpec = `openapi: 3.1.0
info:
  title: Test
  version: 1.0.0
paths: {}`;

    const result = await validateSpec(validSpec);

    const totalCount =
      result.counts.error + result.counts.warning + result.counts.info;
    expect(totalCount).toBe(result.errors.length);
  });
});
