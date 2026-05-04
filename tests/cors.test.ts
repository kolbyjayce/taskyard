import { describe, it, expect } from "vitest";
import { ServerResponse } from "node:http";
import { applyCors } from "../packages/cli/src/mcp-server/cors.js";

function makeRes(): ServerResponse & { _headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  const res = {
    _headers: headers,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
  };
  return res as unknown as ServerResponse & { _headers: Record<string, string> };
}

describe("applyCors", () => {
  it("sets Access-Control-Allow-Origin to *", () => {
    const res = makeRes();
    applyCors(res);
    expect(res._headers["access-control-allow-origin"]).toBe("*");
  });

  it("allows the required HTTP methods", () => {
    const res = makeRes();
    applyCors(res);
    const methods = res._headers["access-control-allow-methods"];
    expect(methods).toContain("GET");
    expect(methods).toContain("POST");
    expect(methods).toContain("DELETE");
    expect(methods).toContain("OPTIONS");
  });

  it("allows Authorization and mcp-session-id request headers", () => {
    const res = makeRes();
    applyCors(res);
    const allowed = res._headers["access-control-allow-headers"];
    expect(allowed).toContain("Authorization");
    expect(allowed).toContain("mcp-session-id");
  });

  it("exposes mcp-session-id so browser clients can read it", () => {
    const res = makeRes();
    applyCors(res);
    expect(res._headers["access-control-expose-headers"]).toContain(
      "mcp-session-id"
    );
  });
});
