import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IncomingMessage, ServerResponse } from "node:http";
import { checkBearerAuth } from "../packages/cli/src/mcp-server/auth.js";

// Minimal mocks — only the fields checkBearerAuth actually reads/writes.
function makeReq(authHeader?: string): IncomingMessage {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as unknown as IncomingMessage;
}

function makeRes(): ServerResponse & {
  _status: number;
  _headers: Record<string, string>;
  _body: string;
} {
  const res = {
    _status: 200,
    _headers: {} as Record<string, string>,
    _body: "",
    writeHead(code: number, headers?: Record<string, string>) {
      this._status = code;
      if (headers) Object.assign(this._headers, headers);
    },
    end(body: string) {
      this._body = body;
    },
  };
  return res as unknown as ServerResponse & {
    _status: number;
    _headers: Record<string, string>;
    _body: string;
  };
}

describe("checkBearerAuth", () => {
  const ORIGINAL_TOKEN = process.env["TASKYARD_AUTH_TOKEN"];

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) {
      delete process.env["TASKYARD_AUTH_TOKEN"];
    } else {
      process.env["TASKYARD_AUTH_TOKEN"] = ORIGINAL_TOKEN;
    }
  });

  describe("unauthenticated mode (no token configured)", () => {
    beforeEach(() => {
      delete process.env["TASKYARD_AUTH_TOKEN"];
    });

    it("allows any request without an Authorization header", async () => {
      const res = makeRes();
      const allowed = await checkBearerAuth(makeReq(), res);
      expect(allowed).toBe(true);
      expect(res._status).toBe(200);
    });

    it("allows requests that do provide a token (token is ignored)", async () => {
      const res = makeRes();
      const allowed = await checkBearerAuth(makeReq("Bearer anything"), res);
      expect(allowed).toBe(true);
    });
  });

  describe("authenticated mode (TASKYARD_AUTH_TOKEN set)", () => {
    beforeEach(() => {
      process.env["TASKYARD_AUTH_TOKEN"] = "supersecret";
    });

    it("allows a request with the correct bearer token", async () => {
      const res = makeRes();
      const allowed = await checkBearerAuth(makeReq("Bearer supersecret"), res);
      expect(allowed).toBe(true);
      expect(res._status).toBe(200);
    });

    it("rejects a request with a wrong token", async () => {
      const res = makeRes();
      const allowed = await checkBearerAuth(makeReq("Bearer wrongtoken"), res);
      expect(allowed).toBe(false);
      expect(res._status).toBe(401);
      expect(res._headers["WWW-Authenticate"]).toMatch(/Bearer/);
      expect(JSON.parse(res._body)).toMatchObject({ error: "Unauthorized" });
    });

    it("rejects a request with no Authorization header", async () => {
      const res = makeRes();
      const allowed = await checkBearerAuth(makeReq(), res);
      expect(allowed).toBe(false);
      expect(res._status).toBe(401);
    });

    it("rejects a request with a non-Bearer scheme", async () => {
      const res = makeRes();
      const allowed = await checkBearerAuth(makeReq("Basic supersecret"), res);
      expect(allowed).toBe(false);
      expect(res._status).toBe(401);
    });

    it("rejects a token that is a prefix of the correct token", async () => {
      const res = makeRes();
      const allowed = await checkBearerAuth(makeReq("Bearer supers"), res);
      expect(allowed).toBe(false);
      expect(res._status).toBe(401);
    });

    it("rejects a token that has the correct token as a prefix", async () => {
      const res = makeRes();
      const allowed = await checkBearerAuth(
        makeReq("Bearer supersecret_extra"),
        res
      );
      expect(allowed).toBe(false);
      expect(res._status).toBe(401);
    });

    it("rejects an empty Bearer token", async () => {
      const res = makeRes();
      const allowed = await checkBearerAuth(makeReq("Bearer "), res);
      expect(allowed).toBe(false);
      expect(res._status).toBe(401);
    });
  });
});
