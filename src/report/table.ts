import type { Report, Status } from "../types";

/**
 * Minimal subset of a color library (picocolors). Accepting an interface keeps
 * the renderer pure and testable, and lets callers pass identity functions to
 * disable color.
 */
export interface Colorizer {
  red: (s: string) => string;
  green: (s: string) => string;
  yellow: (s: string) => string;
  cyan: (s: string) => string;
  dim: (s: string) => string;
  bold: (s: string) => string;
  gray: (s: string) => string;
}

const id = (s: string) => s;
/** A no-op colorizer, handy for tests and `--no-color`. */
export const PLAIN: Colorizer = {
  red: id,
  green: id,
  yellow: id,
  cyan: id,
  dim: id,
  bold: id,
  gray: id,
};

interface Cell {
  /** Plain text, used for width calculation. */
  text: string;
  /** What's actually printed (may contain ANSI codes). */
  render: string;
}

const cell = (text: string, render?: string): Cell => ({
  text,
  render: render ?? text,
});

type Align = "left" | "center";

export interface RenderTableOptions {
  colors: Colorizer;
  filesScanned: number;
}

export function renderTable(report: Report, opts: RenderTableOptions): string {
  const c = opts.colors;
  const lines: string[] = [];

  const envCount = report.environments.length;
  const envList = envCount > 0 ? report.environments.join(", ") : "none";
  const fileWord = opts.filesScanned === 1 ? "file" : "files";
  const envWord = envCount === 1 ? "environment" : "environments";
  lines.push(
    c.bold("EnvGuard") +
      c.dim(
        `  ·  scanned ${opts.filesScanned} ${fileWord}  ·  ${envCount} ${envWord} (${envList})`,
      ),
  );
  lines.push("");

  if (report.findings.length === 0) {
    lines.push(
      c.dim("No environment variables found in code or environments."),
    );
    return lines.join("\n");
  }

  if (envCount === 0) {
    lines.push(
      c.yellow("No environments configured.") +
        c.dim(
          " Add .env.<environment> files or an envguard.yml to compare against.",
        ),
    );
    lines.push("");
    lines.push(c.dim(`Variables referenced in code (${report.findings.length}):`));
    for (const f of report.findings) {
      const ref = f.references[0];
      const loc = ref ? c.dim(`  ${ref.file}:${ref.line}`) : "";
      lines.push(`  ${f.name}${loc}`);
    }
    return lines.join("\n");
  }

  // --- Comparison matrix ---
  const header: Cell[] = [
    cell("VARIABLE"),
    cell("CODE"),
    ...report.environments.map((e) => cell(e)),
    cell("STATUS"),
  ];
  const aligns: Align[] = [
    "left",
    "center",
    ...report.environments.map((): Align => "center"),
    "left",
  ];

  const rows: Cell[][] = [header];
  for (const f of report.findings) {
    const nameCell =
      f.status === "OK" ? cell(f.name, c.dim(f.name)) : cell(f.name);
    const codeCell = f.inCode
      ? cell("✓", c.cyan("✓"))
      : cell("–", c.dim("–"));
    const envCells = report.environments.map((e) =>
      f.presence[e] ? cell("✓", c.green("✓")) : cell("✗", c.red("✗")),
    );
    rows.push([nameCell, codeCell, ...envCells, statusCell(f.status, c)]);
  }

  const widths: number[] = header.map((_, col) =>
    Math.max(...rows.map((r) => r[col]!.text.length)),
  );

  const headerRow = rows[0]!.map((cl) => cell(cl.text, c.dim(cl.text)));
  lines.push(renderRow(headerRow, widths, aligns));
  for (let i = 1; i < rows.length; i++) {
    lines.push(renderRow(rows[i]!, widths, aligns));
  }

  lines.push("");
  lines.push(summaryLine(report, c));

  const details = renderDetails(report, c);
  if (details.length > 0) {
    lines.push("");
    lines.push(...details);
  }

  if (report.warnings.length > 0) {
    lines.push("");
    for (const w of report.warnings) {
      lines.push(c.yellow("warning: ") + w);
    }
  }

  return lines.join("\n");
}

function renderRow(cells: Cell[], widths: number[], aligns: Align[]): string {
  return cells
    .map((cl, i) => pad(cl, widths[i] ?? cl.text.length, aligns[i] ?? "left"))
    .join("  ")
    .replace(/\s+$/, "");
}

function pad(cl: Cell, width: number, align: Align): string {
  const space = Math.max(0, width - cl.text.length);
  if (align === "center") {
    const left = Math.floor(space / 2);
    return " ".repeat(left) + cl.render + " ".repeat(space - left);
  }
  return cl.render + " ".repeat(space);
}

function statusCell(status: Status, c: Colorizer): Cell {
  switch (status) {
    case "MISSING":
      return cell("MISSING", c.bold(c.red("MISSING")));
    case "PARITY":
      return cell("PARITY", c.yellow("PARITY"));
    case "DEAD":
      return cell("DEAD", c.dim("DEAD"));
    case "OK":
      return cell("OK", c.green("OK"));
  }
}

function summaryLine(report: Report, c: Colorizer): string {
  const s = report.summary;
  const parts = [
    s.MISSING > 0 ? c.red(`${s.MISSING} missing`) : c.dim(`${s.MISSING} missing`),
    s.PARITY > 0 ? c.yellow(`${s.PARITY} parity`) : c.dim(`${s.PARITY} parity`),
    c.dim(`${s.DEAD} dead`),
    c.green(`${s.OK} ok`),
  ];
  return "  " + parts.join(c.dim(" · "));
}

function renderDetails(report: Report, c: Colorizer): string[] {
  const out: string[] = [];
  for (const f of report.findings) {
    if (f.status === "OK") continue;

    const first = f.references[0];
    const more =
      f.references.length > 1
        ? c.dim(` (+${f.references.length - 1} more)`)
        : "";
    const where = first
      ? c.dim(`${first.file}:${first.line}`) + more
      : c.dim("—");

    if (f.status === "MISSING") {
      out.push(
        `  ${c.bold(c.red("MISSING"))}  ${c.bold(f.name)} — read at ${where}, not set in any environment`,
      );
    } else if (f.status === "PARITY") {
      const has = report.environments.filter((e) => f.presence[e]);
      const missing = report.environments.filter((e) => !f.presence[e]);
      out.push(
        `  ${c.yellow("PARITY")}   ${c.bold(f.name)} — set in ${has.join(", ")}; missing in ${c.red(missing.join(", "))} (read at ${where})`,
      );
    } else if (f.status === "DEAD") {
      const has = report.environments.filter((e) => f.presence[e]);
      out.push(
        `  ${c.dim("DEAD")}     ${c.bold(f.name)} — set in ${has.join(", ")} but not read by any scanned file`,
      );
    }
  }
  return out;
}
