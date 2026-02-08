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

  const serverChildren = (spec.servers ?? []).map((server, i) =>
    makeNode(
      ["servers", i.toString()],
      server.url ?? `Server ${i + 1}`,
      "server",
      [],
      errors,
    ),
  );
  nodes.push(makeNode(["servers"], "Servers", "servers", serverChildren, errors));

  const tagChildren = (spec.tags ?? []).map((tag, i) =>
    makeNode(
      ["tags", i.toString()],
      tag.name ?? `Tag ${i + 1}`,
      "tag",
      [],
      errors,
    ),
  );
  nodes.push(makeNode(["tags"], "Tags", "tags", tagChildren, errors));

  const paths = spec.paths ?? {};
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

  const c = spec.components ?? {};

  const schemaChildren = Object.keys(c.schemas ?? {}).map((name) =>
    makeNode(["components", "schemas", name], name, "schema", [], errors),
  );
  nodes.push(
    makeNode(["components", "schemas"], "Schemas", "schemas", schemaChildren, errors),
  );

  const responseChildren = Object.keys(c.responses ?? {}).map((name) =>
    makeNode(["components", "responses", name], name, "response", [], errors),
  );
  nodes.push(
    makeNode(["components", "responses"], "Responses", "responses", responseChildren, errors),
  );

  const parameterChildren = Object.keys(c.parameters ?? {}).map((name) =>
    makeNode(["components", "parameters", name], name, "parameter", [], errors),
  );
  nodes.push(
    makeNode(["components", "parameters"], "Parameters", "parameters", parameterChildren, errors),
  );

  const requestBodyChildren = Object.keys(c.requestBodies ?? {}).map((name) =>
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
      requestBodyChildren,
      errors,
    ),
  );

  return nodes;
}
