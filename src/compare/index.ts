import type {
  CodeScanResult,
  EnvRadarConfig,
  EnvironmentVars,
  Finding,
  Report,
  Status,
} from "../types";

/** Severity order used to sort findings (most actionable first). */
const STATUS_ORDER: Record<Status, number> = {
  MISSING: 0,
  PARITY: 1,
  DEAD: 2,
  OK: 3,
};

/**
 * Cross-reference what the code reads against what every environment provides
 * and classify each variable:
 *
 *   MISSING — read by code, provided by no environment.
 *   PARITY  — read by code, present in some environments but not others (drift).
 *   DEAD    — provided by an environment but read by no code.
 *   OK      — read by code and present everywhere (or nothing to compare).
 *
 * `ignore` lists demote a finding to OK so intentional cases don't alert.
 */
export function buildReport(
  code: CodeScanResult,
  environments: EnvironmentVars[],
  config: EnvRadarConfig,
  root: string,
  generatedAt: string,
  warnings: string[] = [],
): Report {
  const ignoreParity = new Set(config.ignore?.parity ?? []);
  const ignoreDead = new Set(config.ignore?.dead ?? []);
  const ignoreMissing = new Set(config.ignore?.missing ?? []);

  const totalEnvs = environments.length;
  const allVars = new Set<string>();
  for (const name of code.vars.keys()) allVars.add(name);
  for (const env of environments) for (const name of env.vars) allVars.add(name);

  const findings: Finding[] = [];
  for (const name of allVars) {
    const inCode = code.vars.has(name);

    const presence: Record<string, boolean> = {};
    let presentCount = 0;
    for (const env of environments) {
      const has = env.vars.has(name);
      presence[env.name] = has;
      if (has) presentCount++;
    }

    let status: Status;
    if (!inCode) {
      status = ignoreDead.has(name) ? "OK" : "DEAD";
    } else if (totalEnvs > 0 && presentCount === 0) {
      status = ignoreMissing.has(name) ? "OK" : "MISSING";
    } else if (totalEnvs > 0 && presentCount < totalEnvs) {
      status = ignoreParity.has(name) ? "OK" : "PARITY";
    } else {
      status = "OK";
    }

    findings.push({
      name,
      status,
      inCode,
      references: code.vars.get(name) ?? [],
      presence,
    });
  }

  findings.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      a.name.localeCompare(b.name),
  );

  const summary: Record<Status, number> = {
    MISSING: 0,
    PARITY: 0,
    DEAD: 0,
    OK: 0,
  };
  for (const f of findings) summary[f.status]++;

  return {
    generatedAt,
    root,
    environments: environments.map((e) => e.name),
    summary,
    findings,
    warnings,
  };
}
