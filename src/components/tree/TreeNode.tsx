import { useState, useCallback } from "react";
import type { TreeNode as TreeNodeType } from "../../types/tree";
import { METHOD_COLORS, SECTION_LABELS } from "../../types/tree";

interface TreeNodeProps {
  node: TreeNodeType;
  selectedPath: string[] | null;
  onSelect: (path: string[]) => void;
  onAdd?: (node: TreeNodeType) => void;
  onDelete?: (node: TreeNodeType) => void;
  depth?: number;
  searchQuery?: string;
}

function pathsEqual(a: string[] | null, b: string[]): boolean {
  if (!a) return false;
  if (a.length !== b.length) return false;
  return a.every((seg, i) => seg === b[i]);
}

function getNodeIcon(type: TreeNodeType["type"]): string {
  switch (type) {
    case "info":
      return "ℹ";
    case "servers":
    case "server":
      return "⬡";
    case "tags":
    case "tag":
      return "⏿";
    case "paths":
      return "⤷";
    case "path":
      return "/";
    case "operation":
      return "→";
    case "components":
      return "◈";
    case "schemas":
    case "schema":
      return "{ }";
    case "responses":
    case "response":
      return "↩";
    case "parameters":
    case "parameter":
      return "?";
    case "requestBodies":
    case "requestBody":
      return "↗";
    default:
      return "•";
  }
}

const ADDABLE_TYPES = new Set([
  "paths",
  "schemas",
  "responses",
  "parameters",
  "requestBodies",
  "servers",
  "tags",
  "path",
]);

const DELETABLE_TYPES = new Set([
  "path",
  "operation",
  "schema",
  "response",
  "parameter",
  "requestBody",
  "server",
  "tag",
]);

function HighlightedLabel({
  text,
  query,
}: {
  text: string;
  query?: string;
}) {
  if (!query || query.length === 0) {
    return <>{text}</>;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return <>{text}</>;
  }

  return (
    <>
      {text.slice(0, index)}
      <span className="bg-yellow-200 dark:bg-yellow-700">
        {text.slice(index, index + query.length)}
      </span>
      {text.slice(index + query.length)}
    </>
  );
}

export default function TreeNodeComponent({
  node,
  selectedPath,
  onSelect,
  onAdd,
  onDelete,
  depth = 0,
  searchQuery,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [hovered, setHovered] = useState(false);
  const hasChildren = node.children.length > 0;
  const isSelected = pathsEqual(selectedPath, node.path);
  const canAdd = ADDABLE_TYPES.has(node.type);
  const canDelete = DELETABLE_TYPES.has(node.type);
  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        setExpanded((prev) => !prev);
      }
    },
    [hasChildren],
  );

  const handleSelect = useCallback(() => {
    onSelect(node.path);
  }, [onSelect, node.path]);

  const handleAdd = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAdd?.(node);
    },
    [onAdd, node],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(node);
    },
    [onDelete, node],
  );

  const methodColor = node.method ? METHOD_COLORS[node.method] : "";
  const sectionLabel = SECTION_LABELS[node.type];
  const displayLabel = node.type === "operation" && node.method
    ? node.method.toUpperCase()
    : node.label;

  return (
    <div>
      <button
        type="button"
        onClick={handleSelect}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`group flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-sm transition-colors ${
          isSelected
            ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <span
            onClick={handleToggle}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-xs text-gray-400"
            role="button"
            tabIndex={-1}
          >
            {expanded ? "▾" : "▸"}
          </span>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}

        <span
          className={`shrink-0 text-xs ${methodColor || "text-gray-400 dark:text-gray-500"}`}
        >
          {getNodeIcon(node.type)}
        </span>

        <span
          className={`truncate ${
            node.type === "operation" && node.method
              ? `font-mono text-xs font-semibold ${methodColor}`
              : sectionLabel && depth === 0
                ? "font-semibold text-gray-900 dark:text-gray-100"
                : ""
          }`}
        >
          <HighlightedLabel text={displayLabel} query={searchQuery} />
        </span>

        {node.type === "operation" && node.label !== displayLabel && (
          <span className="truncate text-xs text-gray-400 dark:text-gray-500">
            {node.label.replace(`${displayLabel} `, "")}
          </span>
        )}

        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          {node.hasErrors && (
            <span className="text-xs text-red-500">●</span>
          )}
          {hovered && canAdd && onAdd && (
            <span
              onClick={handleAdd}
              role="button"
              tabIndex={-1}
              className="rounded px-0.5 text-xs text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title="Add"
            >
              +
            </span>
          )}
          {hovered && canDelete && onDelete && (
            <span
              onClick={handleDelete}
              role="button"
              tabIndex={-1}
              className="rounded px-0.5 text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
              title="Delete"
            >
              ×
            </span>
          )}
        </span>
      </button>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.path.join("/")}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onAdd={onAdd}
              onDelete={onDelete}
              depth={depth + 1}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}
