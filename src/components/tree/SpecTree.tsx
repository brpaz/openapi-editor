import { useState, useMemo, useCallback } from "react";
import { useSpecStore } from "../../store/spec-store";
import { buildTree } from "../../lib/tree-builder";
import type { TreeNode } from "../../types/tree";
import { HTTP_METHODS } from "../../types/tree";
import type { HttpMethod } from "../../types/tree";
import TreeNodeComponent from "./TreeNode";
import TreeSearch from "./TreeSearch";
import {
  addPathAction,
  addOperationAction,
  addSchemaAction,
  addResponseAction,
  addParameterAction,
  addRequestBodyAction,
  addServerAction,
  addTagAction,
  deleteNodeAction,
} from "../../store/actions/tree-actions";

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query) return nodes;
  const lowerQuery = query.toLowerCase();

  return nodes.reduce<TreeNode[]>((acc, node) => {
    const matchesSelf = node.label.toLowerCase().includes(lowerQuery);
    const filteredChildren = filterTree(node.children, query);

    if (matchesSelf || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: matchesSelf ? node.children : filteredChildren,
      });
    }
    return acc;
  }, []);
}

export default function SpecTree() {
  const spec = useSpecStore((s) => s.spec);
  const validation = useSpecStore((s) => s.validation);
  const selectedPath = useSpecStore((s) => s.selectedPath);
  const setSelectedPath = useSpecStore((s) => s.setSelectedPath);
  const [searchQuery, setSearchQuery] = useState("");

  const tree = useMemo(() => {
    if (!spec) return [];
    return buildTree(spec, validation.errors);
  }, [spec, validation.errors]);

  const filteredTree = useMemo(
    () => filterTree(tree, searchQuery),
    [tree, searchQuery],
  );

  const handleSelect = useCallback(
    (path: string[]) => {
      setSelectedPath(path);
    },
    [setSelectedPath],
  );

  const handleAdd = useCallback((node: TreeNode) => {
    const spec = useSpecStore.getState().spec;
    if (!spec) return;

    switch (node.type) {
      case "paths": {
        const name = window.prompt("Path (e.g. /users/{id}):");
        if (name) addPathAction(name);
        break;
      }
      case "path": {
        const pathKey = node.path[1];
        const existingMethods = new Set(
          node.children
            .filter((c) => c.type === "operation" && c.method)
            .map((c) => c.method),
        );
        const available = HTTP_METHODS.filter((m) => !existingMethods.has(m));
        if (available.length === 0) {
          window.alert("All HTTP methods already exist on this path.");
          return;
        }
        const method = window.prompt(
          `HTTP method for ${pathKey}:\nAvailable: ${available.join(", ")}`,
        );
        if (method && available.includes(method.toLowerCase() as HttpMethod)) {
          addOperationAction(pathKey, method.toLowerCase() as HttpMethod);
        }
        break;
      }
      case "schemas": {
        const name = window.prompt("Schema name:");
        if (name) addSchemaAction(name);
        break;
      }
      case "responses": {
        const name = window.prompt("Response name:");
        if (name) addResponseAction(name);
        break;
      }
      case "parameters": {
        const name = window.prompt("Parameter name:");
        if (name) addParameterAction(name);
        break;
      }
      case "requestBodies": {
        const name = window.prompt("Request body name:");
        if (name) addRequestBodyAction(name);
        break;
      }
      case "servers": {
        addServerAction();
        break;
      }
      case "tags": {
        const name = window.prompt("Tag name:");
        if (name) addTagAction(name);
        break;
      }
    }
  }, []);

  const handleDelete = useCallback((node: TreeNode) => {
    const confirmed = window.confirm(
      `Delete "${node.label}"?`,
    );
    if (confirmed) {
      deleteNodeAction(node.path);
    }
  }, []);

  if (!spec) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-gray-400 dark:text-gray-500">
          No spec loaded
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <TreeSearch value={searchQuery} onChange={setSearchQuery} />
      <div className="flex-1 overflow-y-auto px-1 pb-2">
        {filteredTree.length === 0 && searchQuery ? (
          <div className="px-2 py-4 text-center text-xs text-gray-400 dark:text-gray-500">
            No results for &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          filteredTree.map((node) => (
            <TreeNodeComponent
              key={node.path.join("/")}
              node={node}
              selectedPath={selectedPath}
              onSelect={handleSelect}
              onAdd={handleAdd}
              onDelete={handleDelete}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>
    </div>
  );
}
