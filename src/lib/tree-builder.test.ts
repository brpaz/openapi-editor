import { describe, it, expect } from "vitest";
import type { oas31 } from "openapi3-ts";
import { buildTree } from "./tree-builder";
import type { TreeNode } from "../types/tree";
import type { ValidationError } from "../types/validation";

function minimalSpec(
  overrides: Partial<oas31.OpenAPIObject> = {},
): oas31.OpenAPIObject {
  return {
    openapi: "3.1.0",
    info: { title: "Test API", version: "1.0.0" },
    ...overrides,
  } as oas31.OpenAPIObject;
}

/** Find a node by type and assert it exists. */
function findNode(nodes: TreeNode[], type: TreeNode["type"]): TreeNode {
  const node = nodes.find((n) => n.type === type);
  if (!node) throw new Error(`Expected node of type "${type}" to exist`);
  return node;
}

describe("buildTree", () => {
  describe("info node", () => {
    it("should always include an info node first", () => {
      const nodes = buildTree(minimalSpec());
      expect(nodes.length).toBeGreaterThanOrEqual(1);
      expect(nodes[0].type).toBe("info");
      expect(nodes[0].path).toEqual(["info"]);
    });

    it("should use spec title as info node label", () => {
      const nodes = buildTree(minimalSpec({ info: { title: "My API", version: "1.0.0" } }));
      expect(nodes[0].label).toBe("My API");
    });

    it("should use 'API Info' as fallback label when title is missing", () => {
      const nodes = buildTree(minimalSpec({ info: { title: undefined as unknown as string, version: "1.0.0" } }));
      expect(nodes[0].label).toBe("API Info");
    });

    it("should have no children on info node", () => {
      const nodes = buildTree(minimalSpec());
      expect(nodes[0].children).toEqual([]);
    });
  });

  describe("servers", () => {
    it("should not include servers section when servers is empty", () => {
      const nodes = buildTree(minimalSpec({ servers: [] }));
      const serverSection = nodes.find((n) => n.type === "servers");
      expect(serverSection).toBeUndefined();
    });

    it("should not include servers section when servers is absent", () => {
      const nodes = buildTree(minimalSpec());
      const serverSection = nodes.find((n) => n.type === "servers");
      expect(serverSection).toBeUndefined();
    });

    it("should build servers section with children", () => {
      const nodes = buildTree(
        minimalSpec({
          servers: [
            { url: "https://api.example.com" },
            { url: "https://staging.example.com" },
          ],
        }),
      );
      const section = findNode(nodes, "servers");
      expect(section.label).toBe("Servers");
      expect(section.path).toEqual(["servers"]);
      expect(section.children).toHaveLength(2);
      expect(section.children[0].label).toBe("https://api.example.com");
      expect(section.children[0].type).toBe("server");
      expect(section.children[0].path).toEqual(["servers", "0"]);
      expect(section.children[1].path).toEqual(["servers", "1"]);
    });

    it("should use fallback label when server url is missing", () => {
      const nodes = buildTree(
        minimalSpec({
          servers: [{ url: undefined as unknown as string }],
        }),
      );
      const section = findNode(nodes, "servers");
      expect(section.children[0].label).toBe("Server 1");
    });
  });

  describe("tags", () => {
    it("should not include tags section when tags is absent", () => {
      const nodes = buildTree(minimalSpec());
      const tagSection = nodes.find((n) => n.type === "tags");
      expect(tagSection).toBeUndefined();
    });

    it("should not include tags section when tags is empty", () => {
      const nodes = buildTree(minimalSpec({ tags: [] }));
      const tagSection = nodes.find((n) => n.type === "tags");
      expect(tagSection).toBeUndefined();
    });

    it("should build tags section with children", () => {
      const nodes = buildTree(
        minimalSpec({
          tags: [{ name: "Users" }, { name: "Pets" }],
        }),
      );
      const section = findNode(nodes, "tags");
      expect(section.label).toBe("Tags");
      expect(section.path).toEqual(["tags"]);
      expect(section.children).toHaveLength(2);
      expect(section.children[0].label).toBe("Users");
      expect(section.children[0].type).toBe("tag");
      expect(section.children[0].path).toEqual(["tags", "0"]);
    });

    it("should use fallback label when tag name is missing", () => {
      const nodes = buildTree(
        minimalSpec({
          tags: [{ name: undefined as unknown as string }],
        }),
      );
      const section = findNode(nodes, "tags");
      expect(section.children[0].label).toBe("Tag 1");
    });
  });

  describe("paths", () => {
    it("should not include paths section when paths is absent", () => {
      const nodes = buildTree(minimalSpec());
      const pathsSection = nodes.find((n) => n.type === "paths");
      expect(pathsSection).toBeUndefined();
    });

    it("should not include paths section when paths is empty", () => {
      const nodes = buildTree(minimalSpec({ paths: {} }));
      const pathsSection = nodes.find((n) => n.type === "paths");
      expect(pathsSection).toBeUndefined();
    });

    it("should build paths with operation children", () => {
      const nodes = buildTree(
        minimalSpec({
          paths: {
            "/users": {
              get: { responses: {} },
              post: { responses: {} },
            },
          },
        }),
      );
      const section = findNode(nodes, "paths");
      expect(section.label).toBe("Paths");
      expect(section.path).toEqual(["paths"]);
      expect(section.children).toHaveLength(1);

      const usersPath = section.children[0];
      expect(usersPath.label).toBe("/users");
      expect(usersPath.type).toBe("path");
      expect(usersPath.path).toEqual(["paths", "/users"]);
      expect(usersPath.children).toHaveLength(2);

      const getOp = usersPath.children[0];
      expect(getOp.label).toBe("GET /users");
      expect(getOp.type).toBe("operation");
      expect(getOp.method).toBe("get");
      expect(getOp.path).toEqual(["paths", "/users", "get"]);

      const postOp = usersPath.children[1];
      expect(postOp.method).toBe("post");
    });

    it("should include multiple paths in order", () => {
      const nodes = buildTree(
        minimalSpec({
          paths: {
            "/users": { get: { responses: {} } },
            "/pets": { get: { responses: {} } },
          },
        }),
      );
      const section = findNode(nodes, "paths");
      expect(section.children).toHaveLength(2);
      expect(section.children[0].label).toBe("/users");
      expect(section.children[1].label).toBe("/pets");
    });

    it("should ignore non-HTTP-method properties on path items", () => {
      const nodes = buildTree(
        minimalSpec({
          paths: {
            "/users": {
              summary: "Users endpoint",
              description: "Manage users",
              get: { responses: {} },
            } as Record<string, unknown>,
          },
        }),
      );
      const section = findNode(nodes, "paths");
      const usersPath = section.children[0];
      expect(usersPath.children).toHaveLength(1);
      expect(usersPath.children[0].method).toBe("get");
    });

    it("should handle path with no operations", () => {
      const nodes = buildTree(
        minimalSpec({
          paths: {
            "/empty": {} as Record<string, unknown>,
          },
        }),
      );
      const section = findNode(nodes, "paths");
      expect(section.children[0].children).toHaveLength(0);
    });

    it("should handle all HTTP methods", () => {
      const allMethods = {
        get: { responses: {} },
        put: { responses: {} },
        post: { responses: {} },
        delete: { responses: {} },
        options: { responses: {} },
        head: { responses: {} },
        patch: { responses: {} },
        trace: { responses: {} },
      };
      const nodes = buildTree(
        minimalSpec({
          paths: { "/all": allMethods as Record<string, unknown> },
        }),
      );
      const section = findNode(nodes, "paths");
      const allPath = section.children[0];
      expect(allPath.children).toHaveLength(8);
      const methods = allPath.children.map((c) => c.method);
      expect(methods).toEqual([
        "get",
        "put",
        "post",
        "delete",
        "options",
        "head",
        "patch",
        "trace",
      ]);
    });
  });

  describe("components", () => {
    it("should not include component sections when components is absent", () => {
      const nodes = buildTree(minimalSpec());
      const schemas = nodes.find((n) => n.type === "schemas");
      const responses = nodes.find((n) => n.type === "responses");
      expect(schemas).toBeUndefined();
      expect(responses).toBeUndefined();
    });

    it("should build schemas section", () => {
      const nodes = buildTree(
        minimalSpec({
          components: {
            schemas: {
              User: { type: "object" },
              Pet: { type: "object" },
            },
          },
        }),
      );
      const section = findNode(nodes, "schemas");
      expect(section.label).toBe("Schemas");
      expect(section.path).toEqual(["components", "schemas"]);
      expect(section.children).toHaveLength(2);
      expect(section.children[0].label).toBe("User");
      expect(section.children[0].type).toBe("schema");
      expect(section.children[0].path).toEqual(["components", "schemas", "User"]);
    });

    it("should build responses section", () => {
      const nodes = buildTree(
        minimalSpec({
          components: {
            responses: {
              NotFound: { description: "Not found" },
            },
          },
        }),
      );
      const section = findNode(nodes, "responses");
      expect(section.label).toBe("Responses");
      expect(section.path).toEqual(["components", "responses"]);
      expect(section.children).toHaveLength(1);
      expect(section.children[0].label).toBe("NotFound");
      expect(section.children[0].type).toBe("response");
    });

    it("should build parameters section", () => {
      const nodes = buildTree(
        minimalSpec({
          components: {
            parameters: {
              limitParam: { name: "limit", in: "query" },
            },
          },
        }),
      );
      const section = findNode(nodes, "parameters");
      expect(section.label).toBe("Parameters");
      expect(section.path).toEqual(["components", "parameters"]);
      expect(section.children[0].label).toBe("limitParam");
      expect(section.children[0].type).toBe("parameter");
    });

    it("should build request bodies section", () => {
      const nodes = buildTree(
        minimalSpec({
          components: {
            requestBodies: {
              CreateUser: { content: {} },
            },
          },
        }),
      );
      const section = findNode(nodes, "requestBodies");
      expect(section.label).toBe("Request Bodies");
      expect(section.path).toEqual(["components", "requestBodies"]);
      expect(section.children[0].label).toBe("CreateUser");
      expect(section.children[0].type).toBe("requestBody");
    });

    it("should skip empty component sub-sections", () => {
      const nodes = buildTree(
        minimalSpec({
          components: {
            schemas: {},
            responses: {},
          },
        }),
      );
      const schemas = nodes.find((n) => n.type === "schemas");
      const responses = nodes.find((n) => n.type === "responses");
      expect(schemas).toBeUndefined();
      expect(responses).toBeUndefined();
    });
  });

  describe("node ordering", () => {
    it("should produce nodes in order: info, servers, tags, paths, schemas, responses, parameters, requestBodies", () => {
      const nodes = buildTree(
        minimalSpec({
          servers: [{ url: "https://api.example.com" }],
          tags: [{ name: "Users" }],
          paths: { "/users": { get: { responses: {} } } },
          components: {
            schemas: { User: { type: "object" } },
            responses: { NotFound: { description: "Not found" } },
            parameters: { limitParam: { name: "limit", in: "query" } },
            requestBodies: { CreateUser: { content: {} } },
          },
        }),
      );
      const types = nodes.map((n) => n.type);
      expect(types).toEqual([
        "info",
        "servers",
        "tags",
        "paths",
        "schemas",
        "responses",
        "parameters",
        "requestBodies",
      ]);
    });
  });

  describe("validation error mapping", () => {
    it("should mark node as having errors when path matches", () => {
      const errors: ValidationError[] = [
        { message: "Missing title", path: ["info", "title"], severity: "error" },
      ];
      const nodes = buildTree(minimalSpec(), errors);
      expect(nodes[0].hasErrors).toBe(true);
    });

    it("should not mark node when error path does not match", () => {
      const errors: ValidationError[] = [
        { message: "Bad path", path: ["paths", "/users"], severity: "error" },
      ];
      const nodes = buildTree(minimalSpec(), errors);
      expect(nodes[0].hasErrors).toBe(false);
    });

    it("should mark parent and child nodes with errors", () => {
      const errors: ValidationError[] = [
        {
          message: "Missing response",
          path: ["paths", "/users", "get", "responses"],
          severity: "error",
        },
      ];
      const nodes = buildTree(
        minimalSpec({
          paths: { "/users": { get: { responses: {} } } },
        }),
        errors,
      );
      const section = findNode(nodes, "paths");
      expect(section.hasErrors).toBe(true);

      const usersPath = section.children[0];
      expect(usersPath.hasErrors).toBe(true);

      const getOp = usersPath.children[0];
      expect(getOp.hasErrors).toBe(true);
    });

    it("should mark schema node with validation error", () => {
      const errors: ValidationError[] = [
        {
          message: "Invalid type",
          path: ["components", "schemas", "User", "properties", "name"],
          severity: "warning",
        },
      ];
      const nodes = buildTree(
        minimalSpec({
          components: {
            schemas: { User: { type: "object" } },
          },
        }),
        errors,
      );
      const section = findNode(nodes, "schemas");
      expect(section.hasErrors).toBe(true);
      expect(section.children[0].hasErrors).toBe(true);
    });

    it("should have hasErrors false when no validation errors provided", () => {
      const nodes = buildTree(
        minimalSpec({
          servers: [{ url: "https://api.example.com" }],
          paths: { "/users": { get: { responses: {} } } },
        }),
      );
      for (const node of nodes) {
        expect(node.hasErrors).toBe(false);
        for (const child of node.children) {
          expect(child.hasErrors).toBe(false);
        }
      }
    });

    it("should default to empty validation errors", () => {
      const nodes = buildTree(minimalSpec());
      expect(nodes[0].hasErrors).toBe(false);
    });
  });

  describe("minimal spec", () => {
    it("should produce only info node for a minimal spec", () => {
      const nodes = buildTree(minimalSpec());
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe("info");
      expect(nodes[0].label).toBe("Test API");
    });
  });
});
