import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { EnvRadarConfig, EnvironmentConfig } from "../types";

const CONFIG_NAMES = ["envradar.yml", "envradar.yaml"];

export interface LoadedConfig {
  config: EnvRadarConfig;
  /** Absolute path of the config file, if one was found. */
  configPath?: string;
  /** True when environments were discovered from .env files rather than declared. */
  autoDiscovered: boolean;
}

/**
 * Load configuration for a scan. Resolution order:
 *   1. An explicit `--config` path (error if missing).
 *   2. envradar.yml / envradar.yaml next to the scanned root.
 *   3. Zero-config: discover environments from local `.env.*` files.
 *
 * When a config file exists but declares no environments, we still
 * auto-discover them so `failOn`/`ignore` settings can be used on their own.
 */
export async function loadConfig(
  root: string,
  explicitPath?: string,
): Promise<LoadedConfig> {
  let configPath: string | undefined;

  if (explicitPath) {
    configPath = path.isAbsolute(explicitPath)
      ? explicitPath
      : path.join(root, explicitPath);
    if (!existsSync(configPath)) {
      throw new Error(`config file not found: ${explicitPath}`);
    }
  } else {
    for (const name of CONFIG_NAMES) {
      const candidate = path.join(root, name);
      if (existsSync(candidate)) {
        configPath = candidate;
        break;
      }
    }
  }

  if (configPath) {
    const raw = await readFile(configPath, "utf8");
    const config = (parseYaml(raw) ?? {}) as EnvRadarConfig;
    if (
      !config.environments ||
      Object.keys(config.environments).length === 0
    ) {
      config.environments = await discoverDotenvEnvironments(root);
      return { config, configPath, autoDiscovered: true };
    }
    return { config, configPath, autoDiscovered: false };
  }

  const environments = await discoverDotenvEnvironments(root);
  return { config: { environments }, autoDiscovered: true };
}

/**
 * Map local `.env.<name>` files to environments. `.env` becomes "local";
 * `.example`, `.sample` and `.local` files are ignored.
 */
async function discoverDotenvEnvironments(
  root: string,
): Promise<Record<string, EnvironmentConfig>> {
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return {};
  }

  const environments: Record<string, EnvironmentConfig> = {};
  for (const file of entries.sort()) {
    if (!file.startsWith(".env")) continue;
    if (/\.(example|sample|local)$/.test(file)) continue;

    let name: string;
    if (file === ".env") name = "local";
    else if (file.startsWith(".env.")) name = file.slice(".env.".length);
    else continue;
    if (!name) continue;

    environments[name] = { source: "dotenv", path: file };
  }
  return environments;
}
