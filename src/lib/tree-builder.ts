import type { oas31 } from "openapi3-ts";
import type { TreeNode, HttpMethod } from "../types/tree";
import { HTTP_METHODS } from "../types/tree";
import type { ValidationError } from "../types/validation";

function pathStartsWith(errorPath: string[], nodePath: string[]): boolean {
  if (errorPath.length < nodePath.length) return false;
  return nodePath.every((seg, i) => errorPath[i] === seg);
}

function hasErrorsAtPath(
  errors: ValidationError[],
  path: string[],
): boolean {
  return errors.some((e) => pathStartsWith(e.path, path));
}

function makeNode(
  path: string[],
  label: string,
  type: TreeNode["type"],
  children: TreeNode[],
  errors: ValidationError[],
  method?: HttpMethod,
): TreeNode {
  return {
    path,
    label,
    type,
    children,
    hasErrors: hasErrorsAtPath(errors, path),
    ...(method !== undefined && { method }),
  };
}

export function buildTree(
  spec: oas31.OpenAPIObject,
  validationErrors: ValidationError[] = [],
): TreeNode[] {
  const nodes: TreeNode[] = [];
  const errors = validationErrors;

  const infoLabel = spec.info?.title ?? "API Info";
  nodes.push(makeNode(["info"], infoLabel, "info", [], errors));

  if (spec.servers && spec.servers.length > 0) {
    const serverChildren = spec.servers.map((server, i) =>
      makeNode(
        ["servers", i.toString()],
        server.url ?? `Server ${i + 1}`,
        "server",
        [],
        errors,
      ),
    );
    nodes.push(makeNode(["servers"], "Servers", "servers", serverChildren, errors));
  }

  if (spec.tags && spec.tags.length > 0) {
    const tagChildren = spec.tags.map((tag, i) =>
      makeNode(
        ["tags", i.toString()],
        tag.name ?? `Tag ${i + 1}`,
        "tag",
        [],
        errors,
      ),
    );
    nodes.push(makeNode(["tags"], "Tags", "tags", tagChildren, errors));
  }

  if (spec.paths && Object.keys(spec.paths).length > 0) {
    const paths = spec.paths;
    const pathChildren = Object.keys(paths).map((pathKey) => {
      const pathItem = paths[pathKey];
      const operationChildren = HTTP_METHODS.filter(
        (method) => pathItem && method in pathItem,
      ).map((method) =>
        makeNode(
          ["paths", pathKey, method],
          `${method.toUpperCase()} ${pathKey}`,
          "operation",
          [],
          errors,
          method,
        ),
      );

      return makeNode(
        ["paths", pathKey],
        pathKey,
        "path",
        operationChildren,
        errors,
      );
    });
    nodes.push(makeNode(["paths"], "Paths", "paths", pathChildren, errors));
  }

  if (spec.components) {
    const c = spec.components;

    if (c.schemas && Object.keys(c.schemas).length > 0) {
      const children = Object.keys(c.schemas).map((name) =>
        makeNode(["components", "schemas", name], name, "schema", [], errors),
      );
      nodes.push(
        makeNode(["components", "schemas"], "Schemas", "schemas", children, errors),
      );
    }

    if (c.responses && Object.keys(c.responses).length > 0) {
      const children = Object.keys(c.responses).map((name) =>
        makeNode(["components", "responses", name], name, "response", [], errors),
      );
      nodes.push(
        makeNode(["components", "responses"], "Responses", "responses", children, errors),
      );
    }

    if (c.parameters && Object.keys(c.parameters).length > 0) {
      const children = Object.keys(c.parameters).map((name) =>
        makeNode(["components", "parameters", name], name, "parameter", [], errors),
      );
      nodes.push(
        makeNode(["components", "parameters"], "Parameters", "parameters", children, errors),
      );
    }

    if (c.requestBodies && Object.keys(c.requestBodies).length > 0) {
      const children = Object.keys(c.requestBodies).map((name) =>
        makeNode(
          ["components", "requestBodies", name],
          name,
          "requestBody",
          [],
          errors,
        ),
      );
      nodes.push(
        makeNode(
          ["components", "requestBodies"],
          "Request Bodies",
          "requestBodies",
          children,
          errors,
        ),
      );
    }
  }

  return nodes;
}
