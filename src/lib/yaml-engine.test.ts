import { describe, it, expect } from "vitest";
import { Scalar } from "yaml";
import {
  parseYaml,
  stringifyYaml,
  applyEdit,
  addToMap,
  deleteAtPath,
  getAtPath,
  documentToSpec,
} from "./yaml-engine";

const VALID_SPEC = `openapi: 3.1.0
info:
  title: Test API
  version: 1.0.0
paths: {}
`;

const SPEC_WITH_COMMENTS = `# Top-level comment
openapi: 3.1.0
info:
  title: Test API # inline comment
  version: 1.0.0
# paths comment
paths: {}
`;

describe("parseYaml", () => {
  it("returns ok:true for valid YAML", () => {
    const result = parseYaml(VALID_SPEC);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.spec.openapi).toBe("3.1.0");
    expect(result.result.spec.info.title).toBe("Test API");
    expect(result.result.document).toBeDefined();
  });

  it("returns ok:false for invalid YAML syntax", () => {
    const result = parseYaml("{ invalid yaml: [");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeTruthy();
  });

  it("returns ok:false for non-object YAML", () => {
    const result = parseYaml("just a string");
    expect(result.ok).toBe(false);
  });

  it("returns ok:false for empty YAML", () => {
    const result = parseYaml("");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("YAML did not parse to an object");
  });

  it("returns ok:false for YAML with parse errors", () => {
    const result = parseYaml("a: b\na: c\n  d: e");
    expect(result.ok).toBe(false);
  });
});

describe("stringifyYaml", () => {
  it("round-trips valid YAML", () => {
    const result = parseYaml(VALID_SPEC);
    if (!result.ok) throw new Error("parse failed");
    const output = stringifyYaml(result.result.document);
    expect(output).toContain("openapi: 3.1.0");
    expect(output).toContain("title: Test API");
  });
});

describe("applyEdit", () => {
  it("edits a scalar value", () => {
    const result = parseYaml(VALID_SPEC);
    if (!result.ok) throw new Error("parse failed");
    const doc = result.result.document;

    applyEdit(doc, ["info", "title"], "Updated API");
    const node = getAtPath(doc, ["info", "title"]);
    expect(node).toBeInstanceOf(Scalar);
    expect((node as Scalar).value).toBe("Updated API");
  });

  it("sets a nested path that does not exist", () => {
    const result = parseYaml(VALID_SPEC);
    if (!result.ok) throw new Error("parse failed");
    const doc = result.result.document;

    applyEdit(doc, ["info", "description"], "A test description");
    expect(getAtPath(doc, ["info", "description"])).toBe("A test description");
  });

  it("sets a deep nested path", () => {
    const result = parseYaml(VALID_SPEC);
    if (!result.ok) throw new Error("parse failed");
    const doc = result.result.document;

    applyEdit(doc, ["info", "contact", "name"], "Test Author");
    const node = getAtPath(doc, ["info", "contact", "name"]);
    expect(node).toBeInstanceOf(Scalar);
    expect((node as Scalar).value).toBe("Test Author");
  });
});

describe("addToMap", () => {
  it("adds a key-value pair to a map", () => {
    const result = parseYaml(VALID_SPEC);
    if (!result.ok) throw new Error("parse failed");
    const doc = result.result.document;

    addToMap(doc, ["paths"], "/users", { get: { summary: "List users" } });
    const val = getAtPath(doc, ["paths", "/users"]) as Record<string, unknown>;
    expect(val).toBeDefined();
    expect((val.get as Record<string, unknown>).summary).toBe("List users");
  });

  it("adds to a nested map", () => {
    const result = parseYaml(VALID_SPEC);
    if (!result.ok) throw new Error("parse failed");
    const doc = result.result.document;

    addToMap(doc, ["info"], "license", { name: "MIT" });
    const val = getAtPath(doc, ["info", "license"]) as Record<string, unknown>;
    expect(val.name).toBe("MIT");
  });
});

describe("deleteAtPath", () => {
  it("deletes an existing key and returns true", () => {
    const result = parseYaml(VALID_SPEC);
    if (!result.ok) throw new Error("parse failed");
    const doc = result.result.document;

    const deleted = deleteAtPath(doc, ["info", "title"]);
    expect(deleted).toBe(true);
    expect(getAtPath(doc, ["info", "title"])).toBeUndefined();
  });

  it("returns false for non-existent path", () => {
    const result = parseYaml(VALID_SPEC);
    if (!result.ok) throw new Error("parse failed");
    const doc = result.result.document;

    const deleted = deleteAtPath(doc, ["info", "nonexistent"]);
    expect(deleted).toBe(false);
  });
});

describe("getAtPath", () => {
  it("retrieves a scalar node with correct value", () => {
    const result = parseYaml(VALID_SPEC);
    if (!result.ok) throw new Error("parse failed");
    const node = getAtPath(result.result.document, ["openapi"]);
    expect(node).toBeInstanceOf(Scalar);
    expect((node as Scalar).value).toBe("3.1.0");
  });

  it("retrieves a nested scalar node", () => {
    const result = parseYaml(VALID_SPEC);
    if (!result.ok) throw new Error("parse failed");
    const node = getAtPath(result.result.document, ["info", "version"]);
    expect(node).toBeInstanceOf(Scalar);
    expect((node as Scalar).value).toBe("1.0.0");
  });

  it("returns undefined for missing path", () => {
    const result = parseYaml(VALID_SPEC);
    if (!result.ok) throw new Error("parse failed");
    expect(
      getAtPath(result.result.document, ["info", "missing"]),
    ).toBeUndefined();
  });
});

describe("documentToSpec", () => {
  it("returns a plain JS object", () => {
    const result = parseYaml(VALID_SPEC);
    if (!result.ok) throw new Error("parse failed");
    const spec = documentToSpec(result.result.document);
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("Test API");
    expect(spec.paths).toEqual({});
  });

  it("reflects mutations made to the document", () => {
    const result = parseYaml(VALID_SPEC);
    if (!result.ok) throw new Error("parse failed");
    const doc = result.result.document;
    applyEdit(doc, ["info", "title"], "Changed");
    const spec = documentToSpec(doc);
    expect(spec.info.title).toBe("Changed");
  });
});

describe("comment preservation", () => {
  it("preserves comments on untouched nodes after editing", () => {
    const result = parseYaml(SPEC_WITH_COMMENTS);
    if (!result.ok) throw new Error("parse failed");
    const doc = result.result.document;

    applyEdit(doc, ["info", "version"], "2.0.0");
    const output = stringifyYaml(doc);

    expect(output).toContain("# Top-level comment");
    expect(output).toContain("# inline comment");
    expect(output).toContain("# paths comment");
    expect(output).toContain("version: 2.0.0");
  });

  it("preserves comments when adding new fields", () => {
    const result = parseYaml(SPEC_WITH_COMMENTS);
    if (!result.ok) throw new Error("parse failed");
    const doc = result.result.document;

    addToMap(doc, ["info"], "description", "New description");
    const output = stringifyYaml(doc);

    expect(output).toContain("# Top-level comment");
    expect(output).toContain("description: New description");
  });
});
