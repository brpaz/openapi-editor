import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSpecStore } from "./spec-store";

vi.mock("../lib/validator", () => ({
  validateSpecDebounced: vi.fn(),
}));

const VALID_YAML = `openapi: 3.1.0
info:
  title: Test API
  version: 1.0.0
paths: {}
`;

const INVALID_YAML = "{ broken: [";

function getState() {
  return useSpecStore.getState();
}

describe("spec-store", () => {
  beforeEach(() => {
    getState().reset();
    useSpecStore.temporal.getState().clear();
  });

  describe("initial state", () => {
    it("starts with null spec and document", () => {
      const state = getState();
      expect(state.spec).toBeNull();
      expect(state.yamlDocument).toBeNull();
      expect(state.filePath).toBeNull();
      expect(state.isDirty).toBe(false);
      expect(state.selectedPath).toBeNull();
      expect(state.validation.errors).toEqual([]);
    });
  });

  describe("newSpec", () => {
    it("creates a spec from template", () => {
      getState().newSpec();
      const state = getState();
      expect(state.spec).not.toBeNull();
      expect(state.spec?.openapi).toBe("3.1.0");
      expect(state.spec?.info.title).toBe("My API");
      expect(state.yamlDocument).not.toBeNull();
      expect(state.filePath).toBeNull();
      expect(state.isDirty).toBe(false);
    });
  });

  describe("openFile", () => {
    it("parses valid YAML and sets state", async () => {
      await getState().openFile("/test/file.yaml", VALID_YAML);
      const state = getState();
      expect(state.spec?.openapi).toBe("3.1.0");
      expect(state.spec?.info.title).toBe("Test API");
      expect(state.yamlDocument).not.toBeNull();
      expect(state.filePath).toBe("/test/file.yaml");
      expect(state.isDirty).toBe(false);
      expect(state.selectedPath).toBeNull();
    });

    it("throws on invalid YAML", async () => {
      await expect(
        getState().openFile("/test/bad.yaml", INVALID_YAML),
      ).rejects.toThrow();
    });
  });

  describe("updateField", () => {
    it("updates spec and document, sets isDirty", () => {
      getState().newSpec();
      getState().updateField(["info", "title"], "Updated Title");
      const state = getState();
      expect(state.spec?.info.title).toBe("Updated Title");
      expect(state.isDirty).toBe(true);
    });

    it("does nothing when no spec is loaded", () => {
      getState().updateField(["info", "title"], "Nope");
      expect(getState().spec).toBeNull();
    });

    it("reflects changes in YAML output", () => {
      getState().newSpec();
      getState().updateField(["info", "title"], "YAML Title");
      const yaml = getState().getYamlString();
      expect(yaml).toContain("title: YAML Title");
    });
  });

  describe("addElement", () => {
    it("adds a key to a map and sets isDirty", () => {
      getState().newSpec();
      getState().addElement(["paths"], "/users", { get: { summary: "List" } });
      const state = getState();
      expect(state.isDirty).toBe(true);
      const paths = state.spec?.paths as Record<string, unknown>;
      expect(paths["/users"]).toBeDefined();
    });
  });

  describe("removeElement", () => {
    it("removes a key and sets isDirty", () => {
      getState().newSpec();
      getState().addElement(["paths"], "/users", {});
      getState().removeElement(["paths", "/users"]);
      const state = getState();
      expect(state.isDirty).toBe(true);
      const paths = state.spec?.paths as Record<string, unknown>;
      expect(paths["/users"]).toBeUndefined();
    });

    it("does nothing for non-existent path", () => {
      getState().newSpec();
      const specBefore = getState().spec;
      getState().removeElement(["paths", "/nonexistent"]);
      expect(getState().spec).toBe(specBefore);
    });

    it("does nothing when no spec is loaded", () => {
      getState().removeElement(["paths", "/test"]);
      expect(getState().spec).toBeNull();
    });
  });

  describe("save / getYamlString", () => {
    it("returns null when no document", () => {
      expect(getState().save()).toBeNull();
      expect(getState().getYamlString()).toBeNull();
    });

    it("returns YAML string when document exists", () => {
      getState().newSpec();
      const yaml = getState().save();
      expect(yaml).toContain("openapi: 3.1.0");
      expect(yaml).toContain("My API");
    });
  });

  describe("setSelectedPath", () => {
    it("sets the selected path", () => {
      getState().setSelectedPath(["info", "title"]);
      expect(getState().selectedPath).toEqual(["info", "title"]);
    });

    it("clears the selected path with null", () => {
      getState().setSelectedPath(["info"]);
      getState().setSelectedPath(null);
      expect(getState().selectedPath).toBeNull();
    });
  });

  describe("markClean", () => {
    it("sets isDirty to false", () => {
      getState().newSpec();
      getState().updateField(["info", "title"], "Dirty");
      expect(getState().isDirty).toBe(true);
      getState().markClean();
      expect(getState().isDirty).toBe(false);
    });
  });

  describe("reset", () => {
    it("resets all state to initial values", () => {
      getState().newSpec();
      getState().updateField(["info", "title"], "Changed");
      getState().setSelectedPath(["info"]);
      getState().reset();
      const state = getState();
      expect(state.spec).toBeNull();
      expect(state.yamlDocument).toBeNull();
      expect(state.filePath).toBeNull();
      expect(state.isDirty).toBe(false);
      expect(state.selectedPath).toBeNull();
    });
  });

  describe("undo/redo", () => {
    it("undoes an updateField", () => {
      getState().newSpec();
      const originalTitle = getState().spec?.info.title;

      getState().updateField(["info", "title"], "Changed Title");
      expect(getState().spec?.info.title).toBe("Changed Title");

      useSpecStore.temporal.getState().undo();
      expect(getState().spec?.info.title).toBe(originalTitle);
    });

    it("redoes after undo", () => {
      getState().newSpec();
      getState().updateField(["info", "title"], "Changed Title");

      useSpecStore.temporal.getState().undo();
      useSpecStore.temporal.getState().redo();

      expect(getState().spec?.info.title).toBe("Changed Title");
    });

    it("tracks multiple changes", () => {
      getState().newSpec();
      getState().updateField(["info", "title"], "First");
      getState().updateField(["info", "title"], "Second");
      getState().updateField(["info", "title"], "Third");

      useSpecStore.temporal.getState().undo();
      expect(getState().spec?.info.title).toBe("Second");

      useSpecStore.temporal.getState().undo();
      expect(getState().spec?.info.title).toBe("First");
    });

    it("has empty past states initially", () => {
      const { pastStates } = useSpecStore.temporal.getState();
      expect(pastStates.length).toBe(0);
    });
  });
});
