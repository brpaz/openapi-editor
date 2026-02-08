import InfoPanel from "./InfoPanel";
import ServerPanel, { ServersListPanel } from "./ServerPanel";
import TagPanel, { TagsListPanel } from "./TagPanel";
import PathPanel from "./PathPanel";
import OperationPanel from "./OperationPanel";
import SchemaPanel from "./SchemaPanel";
import ResponsePanel from "./ResponsePanel";
import ParameterPanel from "./ParameterPanel";
import RequestBodyPanel from "./RequestBodyPanel";

interface PanelRouterProps {
  path: string[];
}

function getPanelType(path: string[]): string {
  if (path.length === 0) return "unknown";

  const root = path[0];

  if (root === "info") return "info";
  if (root === "tags") return path.length >= 2 ? "tag" : "tags";
  if (root === "servers") return path.length >= 2 ? "server" : "servers";

  if (root === "paths") {
    if (path.length >= 3) return "operation";
    if (path.length === 2) return "path";
    return "paths";
  }

  if (root === "components") {
    if (path.length >= 3) {
      const section = path[1];
      if (section === "schemas") return "schema";
      if (section === "responses") return "response";
      if (section === "parameters") return "parameter";
      if (section === "requestBodies") return "requestBody";
    }
    return "components";
  }

  return "unknown";
}

export default function PanelRouter({ path }: PanelRouterProps) {
  const panelType = getPanelType(path);

  switch (panelType) {
    case "info":
      return <InfoPanel />;
    case "servers":
      return <ServersListPanel />;
    case "server":
      return <ServerPanel index={Number(path[1])} />;
    case "tags":
      return <TagsListPanel />;
    case "tag":
      return <TagPanel index={Number(path[1])} />;
    case "path":
      return <PathPanel pathKey={path[1]} />;
    case "operation":
      return <OperationPanel pathKey={path[1]} method={path[2]} />;
    case "schema":
      return <SchemaPanel name={path[2]} />;
    case "response":
      return <ResponsePanel name={path[2]} />;
    case "parameter":
      return <ParameterPanel name={path[2]} />;
    case "requestBody":
      return <RequestBodyPanel name={path[2]} />;
    default:
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          Select an item from the tree to edit
        </div>
      );
  }
}
