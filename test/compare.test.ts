import { describe, it, expect } from "vitest";
import { buildReport } from "../src/compare";
import type {
  CodeScanResult,
  EnvguardConfig,
  EnvironmentVars,
} from "../src/types";

const AT = "2026-01-01T00:00:00.000Z";

function code(...entries: Array<[string, number]>): CodeScanResult {
  const vars = new Map<string, Array<{ file: string; line: number }>>();
  for (const [name, line] of entries) vars.set(name, [{ file: "app.ts", line }]);
  return { vars, filesScanned: 1 };
}

function env(name: string, vars: string[]): EnvironmentVars {
  return {
    name,
    source: "dotenv",
    origin: `.env.${name}`,
    vars: new Set(vars),
    available: true,
  };
}

function statuses(
  report: ReturnType<typeof buildReport>,
): Record<string, string> {
  return Object.fromEntries(report.findings.map((f) => [f.name, f.status]));
}

describe("buildReport", () => {
  it("classifies MISSING, PARITY, DEAD and OK", () => {
    const report = buildReport(
      code(["DATABASE_URL", 1], ["STRIPE_WEBHOOK_SECRET", 2], ["API_KEY", 3]),
      [
        env("staging", ["DATABASE_URL", "API_KEY", "LEGACY_TOKEN"]),
        env("production", ["DATABASE_URL", "LEGACY_TOKEN"]),
      ],
      {},
      "/repo",
      AT,
    );

    const byName = statuses(report);
    expect(byName["DATABASE_URL"]).toBe("OK");
    expect(byName["STRIPE_WEBHOOK_SECRET"]).toBe("MISSING");
    expect(byName["API_KEY"]).toBe("PARITY");
    expect(byName["LEGACY_TOKEN"]).toBe("DEAD");
    expect(report.summary).toEqual({ MISSING: 1, PARITY: 1, DEAD: 1, OK: 1 });
  });

  it("honours ignore lists", () => {
    const config: EnvguardConfig = {
      ignore: { parity: ["API_KEY"], dead: ["DEBUG"] },
    };
    const report = buildReport(
      code(["API_KEY", 1]),
      [env("staging", ["API_KEY", "DEBUG"]), env("production", [])],
      config,
      "/repo",
      AT,
    );

    const byName = statuses(report);
    expect(byName["API_KEY"]).toBe("OK");
    expect(byName["DEBUG"]).toBe("OK");
  });

  it("treats in-code vars as OK when no environments are configured", () => {
    const report = buildReport(code(["ANYTHING", 1]), [], {}, "/repo", AT);
    expect(report.findings[0]?.status).toBe("OK");
    expect(report.environments).toEqual([]);
  });

  it("sorts findings by severity (most actionable first)", () => {
    const report = buildReport(
      code(["A_OK", 1], ["Z_MISSING", 2]),
      [env("staging", ["A_OK"]), env("production", ["A_OK"])],
      {},
      "/repo",
      AT,
    );
    expect(report.findings[0]?.status).toBe("MISSING");
  });

  it("carries warnings through to the report", () => {
    const report = buildReport(code(), [], {}, "/repo", AT, ["heads up"]);
    expect(report.warnings).toEqual(["heads up"]);
  });
});
