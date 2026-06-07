import type { EnvironmentConfig, EnvironmentVars } from "../types";

/**
 * Contract for an environment source. Each adapter knows how to resolve the
 * set of variable *names* a single environment provides — from a local .env
 * file today, and from a secrets manager (AWS SSM, Vercel, Doppler, GitHub …)
 * in the future. Only names are needed; EnvRadar never reads secret values.
 */
export interface SourceAdapter {
  /** Stable id referenced from envradar.yml, e.g. "dotenv". */
  id: string;
  load(
    envName: string,
    config: EnvironmentConfig,
    root: string,
  ): Promise<EnvironmentVars>;
}
