import fs from "fs/promises";
import path from "path";
import os from "os";
import { z } from "zod";

export const USER_DIR = path.join(os.homedir(), ".taskyard");
export const CENTRAL_CONFIG_DIR = path.join(USER_DIR, "config");
export const CENTRAL_MCP_DIR = path.join(CENTRAL_CONFIG_DIR, "mcp");
export const CENTRAL_PROFILES_DIR = path.join(CENTRAL_MCP_DIR, "profiles");

export const InstallationTypeSchema = z.enum(["local", "central"]);
export const LogLevelSchema = z.enum(["debug", "info", "warn", "error"]);
export const MCPTypeSchema = z.enum(["stdio", "http"]);

export const GlobalConfigSchema = z.object({
  version: z.string(),
  installation_type: InstallationTypeSchema,
  default_mcp_profile: z.string(),
  dashboard_port: z.number().int().min(1024).max(65535),
  auto_register_projects: z.boolean(),
  log_level: LogLevelSchema,
});

export type GlobalConfig = z.infer<typeof GlobalConfigSchema>;

export const ProjectEntrySchema = z.object({
  name: z.string(),
  registered_at: z.string(),
  last_accessed: z.string(),
  mcp_profile: z.string().optional(),
});

export const ProjectRegistrySchema = z.object({
  projects: z.record(z.string(), ProjectEntrySchema),
});

export type ProjectRegistry = z.infer<typeof ProjectRegistrySchema>;

export const MCPConfigSchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  url: z.string().optional(),
  port: z.number().int().min(1024).max(65535).optional(),
});

export const MCPProfileSchema = z.object({
  name: z.string(),
  type: MCPTypeSchema,
  description: z.string(),
  config: MCPConfigSchema,
});

export type MCPProfile = z.infer<typeof MCPProfileSchema>;

const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  version: "0.2.0",
  installation_type: "central",
  default_mcp_profile: "central-http",
  dashboard_port: 3456,
  auto_register_projects: true,
  log_level: "info",
};

const DEFAULT_PROFILES: MCPProfile[] = [
  {
    name: "local-stdio",
    type: "stdio",
    description: "Local installation using stdio communication",
    config: {
      command: "npx",
      args: ["@taskyard/mcp-server", "--root", "{PROJECT_ROOT}"],
      env: {},
    },
  },
  {
    name: "central-http",
    type: "http",
    description: "Central installation using HTTP communication",
    config: {
      url: "http://localhost:3456/mcp",
      port: 3456,
    },
  },
];

/**
 * Ensures the central configuration directory structure exists
 */
export async function ensureCentralConfig(): Promise<void> {
  await fs.mkdir(CENTRAL_CONFIG_DIR, { recursive: true });
  await fs.mkdir(CENTRAL_MCP_DIR, { recursive: true });
  await fs.mkdir(CENTRAL_PROFILES_DIR, { recursive: true });
}

/**
 * Loads global configuration, creating defaults if needed
 */
export async function loadGlobalConfig(): Promise<GlobalConfig> {
  const configPath = path.join(CENTRAL_CONFIG_DIR, "global.json");

  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_GLOBAL_CONFIG, ...parsed };
    return GlobalConfigSchema.parse(merged);
  } catch {
    // Create default config
    await ensureCentralConfig();
    const validatedConfig = GlobalConfigSchema.parse(DEFAULT_GLOBAL_CONFIG);
    await fs.writeFile(configPath, JSON.stringify(validatedConfig, null, 2));
    return validatedConfig;
  }
}

/**
 * Saves global configuration
 */
export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
  const validatedConfig = GlobalConfigSchema.parse(config);
  const configPath = path.join(CENTRAL_CONFIG_DIR, "global.json");
  await ensureCentralConfig();
  await fs.writeFile(configPath, JSON.stringify(validatedConfig, null, 2));
}

/**
 * Loads project registry
 */
export async function loadProjectRegistry(): Promise<ProjectRegistry> {
  const registryPath = path.join(CENTRAL_CONFIG_DIR, "projects.json");

  try {
    const raw = await fs.readFile(registryPath, "utf-8");
    const parsed = JSON.parse(raw);
    return ProjectRegistrySchema.parse(parsed);
  } catch {
    const defaultRegistry = { projects: {} };
    return ProjectRegistrySchema.parse(defaultRegistry);
  }
}

/**
 * Registers a project in the central registry
 */
export async function registerProject(
  projectPath: string,
  projectName: string,
  mcpProfile?: string
): Promise<void> {
  const registry = await loadProjectRegistry();
  const now = new Date().toISOString();

  const projectEntry = ProjectEntrySchema.parse({
    name: projectName,
    registered_at: registry.projects[projectPath]?.registered_at || now,
    last_accessed: now,
    mcp_profile: mcpProfile,
  });

  registry.projects[projectPath] = projectEntry;

  const validatedRegistry = ProjectRegistrySchema.parse(registry);
  const registryPath = path.join(CENTRAL_CONFIG_DIR, "projects.json");
  await ensureCentralConfig();
  await fs.writeFile(registryPath, JSON.stringify(validatedRegistry, null, 2));
}

/**
 * Loads MCP profiles, creating defaults if needed
 */
export async function loadMCPProfiles(): Promise<MCPProfile[]> {
  try {
    const files = await fs.readdir(CENTRAL_PROFILES_DIR);
    const profiles = await Promise.all(
      files
        .filter(file => file.endsWith(".json"))
        .map(async file => {
          const content = await fs.readFile(path.join(CENTRAL_PROFILES_DIR, file), "utf-8");
          const parsed = JSON.parse(content);
          return MCPProfileSchema.parse(parsed);
        })
    );
    return profiles;
  } catch {
    // Create default profiles
    await ensureCentralConfig();
    const validatedProfiles = DEFAULT_PROFILES.map(profile => MCPProfileSchema.parse(profile));
    await Promise.all(
      validatedProfiles.map(profile =>
        fs.writeFile(
          path.join(CENTRAL_PROFILES_DIR, `${profile.name}.json`),
          JSON.stringify(profile, null, 2)
        )
      )
    );
    return validatedProfiles;
  }
}

/**
 * Gets MCP profile by name
 */
export async function getMCPProfile(name: string): Promise<MCPProfile | null> {
  const profiles = await loadMCPProfiles();
  return profiles.find(p => p.name === name) || null;
}

/**
 * Generates MCP configuration for Claude based on installation type and profile
 */
const ClaudeMCPConfigSchema = z.object({
  mcpServers: z.object({
    taskyard: z.union([
      z.object({
        type: z.literal("stdio"),
        command: z.string(),
        args: z.array(z.string()),
        env: z.record(z.string(), z.string()),
      }),
      z.object({
        type: z.literal("http"),
        url: z.string(),
      }),
    ]),
  }),
});

export type ClaudeMCPConfig = z.infer<typeof ClaudeMCPConfigSchema>;

export async function generateMCPConfig(
  projectPath: string,
  installationType?: z.infer<typeof InstallationTypeSchema>,
  profileName?: string
): Promise<ClaudeMCPConfig> {
  const globalConfig = await loadGlobalConfig();
  const actualInstallationType = InstallationTypeSchema.parse(installationType || globalConfig.installation_type);
  const actualProfileName = profileName || globalConfig.default_mcp_profile;

  if (actualInstallationType === "local") {
    // Use local stdio configuration
    const profile = await getMCPProfile("local-stdio");
    if (!profile) throw new Error("local-stdio profile not found");

    if (!profile.config.command || !profile.config.args) {
      throw new Error("local-stdio profile missing required command/args");
    }

    const config = {
      mcpServers: {
        taskyard: {
          type: "stdio" as const,
          command: profile.config.command,
          args: profile.config.args.map(arg =>
            arg.replace("{PROJECT_ROOT}", projectPath)
          ),
          env: profile.config.env || {},
        },
      },
    };
    return ClaudeMCPConfigSchema.parse(config);
  } else {
    // Use central HTTP configuration
    const profile = await getMCPProfile(actualProfileName);
    if (!profile) throw new Error(`Profile ${actualProfileName} not found`);

    if (profile.type === "http") {
      if (!profile.config.url) {
        throw new Error(`HTTP profile ${actualProfileName} missing required URL`);
      }
      const config = {
        mcpServers: {
          taskyard: {
            type: "http" as const,
            url: profile.config.url,
          },
        },
      };
      return ClaudeMCPConfigSchema.parse(config);
    } else {
      // Central but using stdio (single server for all projects)
      if (!profile.config.command || !profile.config.args) {
        throw new Error(`stdio profile ${actualProfileName} missing required command/args`);
      }
      const config = {
        mcpServers: {
          taskyard: {
            type: "stdio" as const,
            command: profile.config.command,
            args: profile.config.args.map(arg =>
              arg === "{PROJECT_ROOT}" ? USER_DIR : arg
            ),
            env: profile.config.env || {},
          },
        },
      };
      return ClaudeMCPConfigSchema.parse(config);
    }
  }
}

/**
 * Updates last accessed time for a project
 */
export async function updateProjectAccess(projectPath: string): Promise<void> {
  const registry = await loadProjectRegistry();
  if (registry.projects[projectPath]) {
    registry.projects[projectPath].last_accessed = new Date().toISOString();
    const registryPath = path.join(CENTRAL_CONFIG_DIR, "projects.json");
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
  }
}