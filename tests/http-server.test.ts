import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  startHttpServer,
  HttpServerHandle,
} from "../packages/cli/src/mcp-server/http-server.js";

// MCP initialize payload — the minimum valid body to open a session.
const initializeBody = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-client", version: "0.0.0" },
  },
});

async function get(port: number, path: string, headers?: Record<string, string>) {
  return fetch(`http://127.0.0.1:${port}${path}`, { headers });
}

async function post(
  port: number,
  path: string,
  body: string,
  headers?: Record<string, string>
) {
  return fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    // MCP Streamable HTTP spec: POST must advertise both content types.
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body,
  });
}

async function options(port: number, path: string) {
  return fetch(`http://127.0.0.1:${port}${path}`, { method: "OPTIONS" });
}

describe("HTTP server", () => {
  let tmpDir: string;
  let handle: HttpServerHandle;
  const ORIGINAL_TOKEN = process.env["TASKYARD_AUTH_TOKEN"];

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "taskyard-http-test-"));
    await fs.mkdir(path.join(tmpDir, "tasks"), { recursive: true });
    delete process.env["TASKYARD_AUTH_TOKEN"];
    handle = await startHttpServer({ port: 0, root: tmpDir });
  });

  afterEach(async () => {
    await handle.close();
    await fs.rm(tmpDir, { recursive: true });
    if (ORIGINAL_TOKEN === undefined) {
      delete process.env["TASKYARD_AUTH_TOKEN"];
    } else {
      process.env["TASKYARD_AUTH_TOKEN"] = ORIGINAL_TOKEN;
    }
  });

  describe("infrastructure routes", () => {
    it("GET /healthz returns 200 ok", async () => {
      const res = await get(handle.port, "/healthz");
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("ok");
    });

    it("OPTIONS preflight returns 204 with CORS headers", async () => {
      const res = await options(handle.port, "/mcp");
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
      expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    });

    it("unknown routes return 404", async () => {
      const res = await get(handle.port, "/unknown");
      expect(res.status).toBe(404);
    });

    it("CORS headers are present on every response", async () => {
      const res = await get(handle.port, "/healthz");
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
    });
  });

  describe("auth — unauthenticated mode", () => {
    it("allows /mcp requests without an Authorization header", async () => {
      // A POST to /mcp without session-id expects an initialize body; anything
      // other than a 401 confirms auth is not blocking the request.
      const res = await post(handle.port, "/mcp", "{}");
      expect(res.status).not.toBe(401);
    });

    it("GET /healthz is always accessible", async () => {
      const res = await get(handle.port, "/healthz");
      expect(res.status).toBe(200);
    });
  });

  describe("auth — authenticated mode", () => {
    // Re-create the server with a token set for this group.
    let authedHandle: HttpServerHandle;

    beforeEach(async () => {
      process.env["TASKYARD_AUTH_TOKEN"] = "test-token";
      authedHandle = await startHttpServer({ port: 0, root: tmpDir });
    });

    afterEach(async () => {
      await authedHandle.close();
    });

    it("rejects /mcp requests without a token", async () => {
      const res = await post(authedHandle.port, "/mcp", initializeBody);
      expect(res.status).toBe(401);
    });

    it("rejects /mcp requests with a wrong token", async () => {
      const res = await post(authedHandle.port, "/mcp", initializeBody, {
        Authorization: "Bearer wrong",
      });
      expect(res.status).toBe(401);
    });

    it("allows /mcp requests with the correct token", async () => {
      const res = await post(authedHandle.port, "/mcp", initializeBody, {
        Authorization: "Bearer test-token",
      });
      expect(res.status).not.toBe(401);
    });

    it("GET /healthz is accessible without a token even in auth mode", async () => {
      const res = await get(authedHandle.port, "/healthz");
      expect(res.status).toBe(200);
    });
  });

  describe("MCP /mcp endpoint", () => {
    it("rejects a POST with malformed JSON", async () => {
      const res = await post(handle.port, "/mcp", "not-json");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe(-32700);
    });

    it("rejects a POST that is valid JSON but not an initialize request", async () => {
      const res = await post(
        handle.port,
        "/mcp",
        JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.message).toMatch(/initialize/i);
    });

    it("rejects a GET to /mcp with no session id", async () => {
      const res = await get(handle.port, "/mcp");
      expect(res.status).toBe(400);
    });

    it("opens a session with a valid initialize POST", async () => {
      const res = await post(handle.port, "/mcp", initializeBody);
      // StreamableHTTPServerTransport responds 200 with the initialize result.
      expect(res.status).toBe(200);
      const sessionId = res.headers.get("mcp-session-id");
      expect(sessionId).toBeTruthy();
    });

    it("returns session id in response headers after initialize", async () => {
      const res = await post(handle.port, "/mcp", initializeBody);
      expect(res.headers.get("mcp-session-id")).toMatch(/^[0-9a-f-]{36}$/);
    });

    it("rejects requests to an unknown session id", async () => {
      const res = await post(handle.port, "/mcp", initializeBody, {
        "mcp-session-id": "00000000-0000-0000-0000-000000000000",
      });
      expect(res.status).toBe(400);
    });
  });
});
