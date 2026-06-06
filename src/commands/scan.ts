import path from "node:path";
import { writeFile } from "node:fs/promises";
import { createColors } from "picocolors";
import { scanCode } from "../scan";
import { loadConfig } from "../config/load";
import { resolveEnvironments } from "../sources";
import { buildReport } from "../compare";
import { renderTable, type Colorizer } from "../report/table";
import { renderMarkdown } from "../report/markdown";
import type { Status } from "../types";

export interface ScanCommandOptions {
  config?: string;
  format?: string;
  output?: string;
  failOn?: string;
  color?: boolean;
}

const FORMATS = ["table", "json", "markdown"];
const FAILABLE: Status[] = ["MISSING", "PARITY", "DEAD"];

/** Run the `scan` command and return the process exit code. */
export async function runScan(
  targetPath: string,
  options: ScanCommandOptions,
): Promise<number> {
  const root = path.resolve(process.cwd(), targetPath || ".");

  const format = (options.format ?? "table").toLowerCase();
  if (!FORMATS.includes(format)) {
    throw new Error(
      `unknown format "${options.format}" (expected: ${FORMATS.join(", ")})`,
    );
  }

  const { config } = await loadConfig(root, options.config);
  const code = await scanCode(root, {
    include: config.scan?.include,
    exclude: config.scan?.exclude,
  });
  const { environments, warnings } = await resolveEnvironments(config, root);

  const generatedAt = new Date().toISOString();
  const report = buildReport(
    code,
    environments,
    config,
    root,
    generatedAt,
    warnings,
  );

  if (format === "json") {
    const payload = { version: 1, ...report, filesScanned: code.filesScanned };
    await emit(JSON.stringify(payload, null, 2) + "\n", options.output);
  } else if (format === "markdown") {
    await emit(renderMarkdown(report) + "\n", options.output);
  } else {
    const enabled =
      options.color !== false &&
      Boolean(process.stdout.isTTY) &&
      !process.env.NO_COLOR;
    const colors = createColors(enabled) as Colorizer;
    const text = renderTable(report, {
      colors,
      filesScanned: code.filesScanned,
    });
    await emit(text + "\n", options.output);
    // Surface warnings on stderr too, so piping the report stays clean.
    for (const w of warnings) {
      process.stderr.write(colors.yellow("warning: ") + w + "\n");
    }
  }

  const failOn = resolveFailOn(options.failOn, config.failOn);
  const failed = failOn.some((s) => report.summary[s] > 0);
  return failed ? 1 : 0;
}

async function emit(content: string, output?: string): Promise<void> {
  if (output) {
    const dest = path.isAbsolute(output)
      ? output
      : path.resolve(process.cwd(), output);
    await writeFile(dest, content);
  } else {
    process.stdout.write(content);
  }
}

function resolveFailOn(
  flag: string | undefined,
  configFailOn: Status[] | undefined,
): Status[] {
  if (flag !== undefined) return parseStatusList(flag);
  if (configFailOn && configFailOn.length > 0) {
    return configFailOn
      .map((s) => String(s).toUpperCase() as Status)
      .filter((s) => FAILABLE.includes(s));
  }
  return ["MISSING", "PARITY"];
}

function parseStatusList(raw: string): Status[] {
  const tokens = raw
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  if (tokens.includes("NONE")) return [];

  const out: Status[] = [];
  for (const t of tokens) {
    if (FAILABLE.includes(t as Status)) out.push(t as Status);
    else
      throw new Error(
        `invalid --fail-on value "${t}" (expected any of: missing, parity, dead, none)`,
      );
  }
  return out;
}
