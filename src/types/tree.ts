export type TreeNodeType =
  | "root"
  | "info"
  | "servers"
  | "server"
  | "tags"
  | "tag"
  | "paths"
  | "path"
  | "operation"
  | "components"
  | "schemas"
  | "schema"
  | "responses"
  | "response"
  | "parameters"
  | "parameter"
  | "requestBodies"
  | "requestBody";

export const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface TreeNode {
  /** JSON path segments, e.g. ["paths", "/users", "get"] */
  path: string[];
  label: string;
  type: TreeNodeType;
  children: TreeNode[];
  hasErrors: boolean;
  /** Only present on operation nodes */
  method?: HttpMethod;
}

export const METHOD_COLORS: Record<HttpMethod, string> = {
  get: "text-green-600 dark:text-green-400",
  post: "text-blue-600 dark:text-blue-400",
  put: "text-amber-600 dark:text-amber-400",
  patch: "text-orange-600 dark:text-orange-400",
  delete: "text-red-600 dark:text-red-400",
  options: "text-purple-600 dark:text-purple-400",
  head: "text-teal-600 dark:text-teal-400",
  trace: "text-gray-600 dark:text-gray-400",
};

export const SECTION_LABELS: Partial<Record<TreeNodeType, string>> = {
  info: "Info",
  servers: "Servers",
  tags: "Tags",
  paths: "Paths",
  components: "Components",
  schemas: "Schemas",
  responses: "Responses",
  parameters: "Parameters",
  requestBodies: "Request Bodies",
};
