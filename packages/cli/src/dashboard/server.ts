import { createServer, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { FileStore } from "../mcp-server/store.js";
import { applyCors } from "../mcp-server/cors.js";
import { handleDashboardApi } from "./api.js";

// At runtime (after tsc), this file lives at:
//   packages/cli/dist/dashboard/server.js
// Vite outputs the SPA to a sibling directory:
//   packages/cli/dist/dashboard-ui/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATIC_DIR = path.resolve(__dirname, "../dashboard-ui");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json",
  ".map": "application/json",
};

export interface DashboardServerOptions {
  port: number;
  root: string;
}

export interface DashboardServerHandle {
  port: number;
  url: string;
  close: () => Promise<void>;
}

export async function startDashboardServer(
  opts: DashboardServerOptions
): Promise<DashboardServerHandle> {
  const store = new FileStore(opts.root);

  const httpServer = createServer(async (req, res) => {
    try {
      applyCors(res);
      if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

      const url = new URL(req.url ?? "/", "http://localhost");

      if (await handleDashboardApi(req, res, url, store)) return;

      await serveStatic(res, url);
    } catch (err) {
      console.error("[dashboard]", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
  });

  const port = await new Promise<number>((resolve, reject) => {
    httpServer.listen(opts.port, "127.0.0.1", () => {
      resolve((httpServer.address() as AddressInfo).port);
    });
    httpServer.once("error", reject);
  });

  const close = (): Promise<void> =>
    new Promise((resolve, reject) =>
      httpServer.close((err) => (err ? reject(err) : resolve()))
    );

  return { port, url: `http://localhost:${port}`, close };
}

export async function serveStatic(res: ServerResponse, url: URL): Promise<void> {
  let rel = url.pathname.replace(/^\//, "");
  if (!rel || rel.endsWith("/")) rel = "index.html";

  const filePath = path.resolve(STATIC_DIR, rel);

  // Security: prevent path traversal
  if (!filePath.startsWith(STATIC_DIR + path.sep) && filePath !== path.resolve(STATIC_DIR, "index.html")) {
    res.writeHead(403); res.end(); return;
  }

  let file: Buffer;
  try {
    file = await readFile(filePath);
  } catch {
    // SPA fallback
    try {
      file = await readFile(path.join(STATIC_DIR, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      res.end(file);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found");
    }
    return;
  }

  const ext = path.extname(filePath);
  const mime = MIME[ext] ?? "application/octet-stream";
  const cache = rel.startsWith("assets/") ? "public, max-age=31536000, immutable" : "no-cache";
  res.writeHead(200, { "Content-Type": mime, "Cache-Control": cache });
  res.end(file);
}
