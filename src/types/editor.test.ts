import { describe, it, expect } from "vitest";
import { pathToPointer, pointerToPath } from "./editor";

describe("pathToPointer", () => {
  it("should return empty string for empty path", () => {
    expect(pathToPointer([])).toBe("");
  });

  it("should return single segment with leading slash", () => {
    expect(pathToPointer(["segment"])).toBe("/segment");
  });

  it("should encode tilde as ~0", () => {
    expect(pathToPointer(["a~b"])).toBe("/a~0b");
  });

  it("should encode forward slash as ~1", () => {
    expect(pathToPointer(["a/b"])).toBe("/a~1b");
  });

  it("should handle multiple segments", () => {
    expect(pathToPointer(["paths", "/users", "get"])).toBe("/paths/~1users/get");
  });

  it("should encode both tilde and slash in same segment", () => {
    expect(pathToPointer(["a~b/c"])).toBe("/a~0b~1c");
  });
});

describe("pointerToPath", () => {
  it("should return empty array for empty string", () => {
    expect(pointerToPath("")).toEqual([]);
  });

  it("should return single segment without leading slash", () => {
    expect(pointerToPath("/segment")).toEqual(["segment"]);
  });

  it("should decode ~0 as tilde", () => {
    expect(pointerToPath("/a~0b")).toEqual(["a~b"]);
  });

  it("should decode ~1 as forward slash", () => {
    expect(pointerToPath("/a~1b")).toEqual(["a/b"]);
  });

  it("should handle multiple segments", () => {
    expect(pointerToPath("/paths/~1users/get")).toEqual([
      "paths",
      "/users",
      "get",
    ]);
  });

  it("should decode both tilde and slash in same segment", () => {
    expect(pointerToPath("/a~0b~1c")).toEqual(["a~b/c"]);
  });
});

describe("round-trip conversion", () => {
  it("should convert path to pointer and back to original path", () => {
    const original = ["paths", "/users/{id}", "get"];
    const pointer = pathToPointer(original);
    const result = pointerToPath(pointer);
    expect(result).toEqual(original);
  });

  it("should handle complex path with special characters", () => {
    const original = ["a~b/c", "d/e~f"];
    const pointer = pathToPointer(original);
    const result = pointerToPath(pointer);
    expect(result).toEqual(original);
  });

  it("should handle empty path round-trip", () => {
    const original: string[] = [];
    const pointer = pathToPointer(original);
    const result = pointerToPath(pointer);
    expect(result).toEqual(original);
  });
});
