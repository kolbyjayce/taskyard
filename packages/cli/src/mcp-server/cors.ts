import { ServerResponse } from "node:http";

export function applyCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, mcp-session-id, last-event-id"
  );
  // mcp-session-id must be exposed so browser MCP clients can read it from JS.
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
}
