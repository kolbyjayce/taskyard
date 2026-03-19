import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simpleGit } from "simple-git";
import type { FileStore } from "../store.js";

export function registerGitTools(
  server: McpServer,
  store: FileStore,
  toolHandlers?: Map<string, (args: Record<string, unknown>) => Promise<unknown>>
) {

  server.tool(
    "git_commit",
    "Commit all current changes with an agent-attributed message.",
    {
      message: z.string(),
      agent_id: z.string(),
    },
    async ({ message, agent_id }) => {
      const git = simpleGit(store.root);
      await git.add(".");
      const result = await git.commit(`[agent:${agent_id}] ${message}`);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, commit: result.commit }) }],
      };
    }
  );

  server.tool(
    "git_sync",
    "Pull latest from remote then push local commits. Safe for multi-machine use.",
    {
      agent_id: z.string(),
    },
    async ({ agent_id }) => {
      const git = simpleGit(store.root);
      const hasRemote = (await git.getRemotes()).length > 0;
      if (!hasRemote) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, note: "No remote configured — local only" }) }],
        };
      }

      // Pull with rebase to keep history clean
      await git.pull(["--rebase"]);
      await git.push();

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true }) }],
      };
    }
  );
}
