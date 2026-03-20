import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { FileStore } from "./store.js";
import { createLogger } from "./logger.js";
import { getDashboardPath } from "./utils/user-dir.js";

// A thin HTTP layer so the dashboard can call MCP tools without a full
// WebSocket transport. This runs alongside the stdio MCP server.

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export function createHttpAdapter(store: FileStore, toolHandlers: Map<string, ToolHandler>, port: number) {
  const logger = createLogger("http-adapter", store.root);

  // Serve dashboard files from ~/.taskyard/dashboard (installed by CLI)
  const dashboardDist = getDashboardPath();

  logger.debug("HTTP adapter configuration", { port, dashboardDist });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);

    // ── CORS for local dev ─────────────────────────────────────────────────
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    // ── /api/tool  POST ────────────────────────────────────────────────────
    if (url.pathname === "/api/tool" && req.method === "POST") {
      const body = await readBody(req);
      const { tool, args } = JSON.parse(body);
      logger.debug("Tool request", { tool, args });

      const handler = toolHandlers.get(tool);
      if (!handler) {
        logger.warn("Unknown tool requested", { tool });
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Unknown tool: ${tool}` }));
        return;
      }
      try {
        const result = await handler(args);
        logger.debug("Tool executed successfully", { tool });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (e: unknown) {
        logger.error("Tool execution failed", { tool, error: String(e) });
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(e) }));
      }
      return;
    }

    // ── /api/projects  GET ─────────────────────────────────────────────────
    if (url.pathname === "/api/projects" && req.method === "GET") {
      const projectsDir = path.join(store.root, "projects");
      const entries = await fs.readdir(projectsDir, { withFileTypes: true }).catch(() => []);
      const names = entries.filter(e => e.isDirectory()).map(e => e.name);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(names));
      return;
    }

    // ── /api/changelog  GET ────────────────────────────────────────────────
    if (url.pathname === "/api/changelog" && req.method === "GET") {
      const log = await fs.readFile(path.join(store.root, "CHANGELOG.md"), "utf-8").catch(() => "");
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(log);
      return;
    }

    // ── Static dashboard assets ────────────────────────────────────────────
    let filePath = path.join(dashboardDist, url.pathname === "/" ? "index.html" : url.pathname);
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!exists) filePath = path.join(dashboardDist, "index.html"); // SPA fallback

    const ext = path.extname(filePath);
    const mime: Record<string, string> = {
      ".html": "text/html",
      ".js":   "application/javascript",
      ".css":  "text/css",
      ".svg":  "image/svg+xml",
      ".ico":  "image/x-icon",
    };

    try {
      const content = await fs.readFile(filePath);
      res.writeHead(200, { "Content-Type": mime[ext] ?? "application/octet-stream" });
      res.end(content);
    } catch (error) {
      logger.debug("Failed to serve file", { filePath, error: String(error) });
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Dashboard Not Found</title></head>
        <body>
          <h1>Dashboard not available</h1>
          <p>Dashboard assets not found. Please run:</p>
          <code>taskyard init</code>
          <p>to install the dashboard assets.</p>
        </body>
        </html>
      `);
    }
  });

  server.listen(port, () => {
    logger.info("HTTP adapter listening", { url: `http://localhost:${port}` });
  });

  return server;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
