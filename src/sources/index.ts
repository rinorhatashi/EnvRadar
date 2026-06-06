import { dotenvAdapter } from "./dotenv";
import type { SourceAdapter } from "./types";
import type { EnvguardConfig, EnvironmentVars } from "../types";

/** Registry of available source adapters, keyed by id. */
const ADAPTERS: Record<string, SourceAdapter> = {
  [dotenvAdapter.id]: dotenvAdapter,
};

export interface ResolvedEnvironments {
  environments: EnvironmentVars[];
  warnings: string[];
}

/**
 * Resolve every configured environment to the set of variables it provides.
 * Environments whose source can't be read are skipped with a warning rather
 * than flooding the report with false "missing" findings.
 */
export async function resolveEnvironments(
  config: EnvguardConfig,
  root: string,
): Promise<ResolvedEnvironments> {
  const warnings: string[] = [];
  const environments: EnvironmentVars[] = [];

  for (const [name, envCfg] of Object.entries(config.environments ?? {})) {
    const sourceId = envCfg.source ?? "dotenv";
    const adapter = ADAPTERS[sourceId];
    if (!adapter) {
      warnings.push(
        `environment "${name}": unknown source "${sourceId}" — skipping`,
      );
      continue;
    }

    const env = await adapter.load(name, envCfg, root);
    if (!env.available) {
      warnings.push(
        `environment "${name}": could not read ${env.origin} — skipping`,
      );
      continue;
    }
    environments.push(env);
  }

  return { environments, warnings };
}
