import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FileStore } from "../store.js";

export function registerStatusTools(
  server: McpServer,
  store: FileStore,
  toolHandlers?: Map<string, (args: Record<string, unknown>) => Promise<unknown>>
) {
  // TODO: Implement status tools
}