import type { Finding, Report } from "../types";

/** HTML marker so the GitHub Action can find and update its own comment. */
export const MARKDOWN_MARKER = "<!-- envguard-report -->";

/** Render the report as Markdown suitable for a pull-request comment. */
export function renderMarkdown(report: Report): string {
  const s = report.summary;
  const out: string[] = [];

  out.push(MARKDOWN_MARKER);
  out.push("## EnvGuard — environment variable report");
  out.push("");

  const envText = report.environments.length
    ? "`" + report.environments.join("`, `") + "`"
    : "_no environments configured_";
  out.push(
    `**${s.MISSING} missing · ${s.PARITY} parity drift · ${s.DEAD} dead · ${s.OK} ok** across ${envText}.`,
  );
  out.push("");

  const missing = report.findings.filter((f) => f.status === "MISSING");
  const parity = report.findings.filter((f) => f.status === "PARITY");
  const dead = report.findings.filter((f) => f.status === "DEAD");

  if (missing.length > 0) {
    out.push("### ❌ Missing — code reads it, no environment provides it");
    out.push("");
    out.push("| Variable | Read at |");
    out.push("| --- | --- |");
    for (const f of missing) out.push(`| \`${f.name}\` | ${refList(f)} |`);
    out.push("");
  }

  if (parity.length > 0) {
    out.push(
      "### ⚠️ Parity drift — present in some environments, missing in others",
    );
    out.push("");
    out.push(`| Variable | ${report.environments.join(" | ")} | Read at |`);
    out.push(
      `| --- |${report.environments.map(() => " --- |").join("")} --- |`,
    );
    for (const f of parity) {
      const cells = report.environments
        .map((e) => (f.presence[e] ? "✅" : "❌"))
        .join(" | ");
      out.push(`| \`${f.name}\` | ${cells} | ${refList(f)} |`);
    }
    out.push("");
  }

  if (dead.length > 0) {
    out.push("### 🧹 Dead — configured but no code reads it");
    out.push("");
    out.push("| Variable | Configured in |");
    out.push("| --- | --- |");
    for (const f of dead) {
      const has = report.environments
        .filter((e) => f.presence[e])
        .join(", ");
      out.push(`| \`${f.name}\` | ${has} |`);
    }
    out.push("");
  }

  if (missing.length === 0 && parity.length === 0 && dead.length === 0) {
    out.push(
      "✅ Every variable the code reads is present in all configured environments, and nothing is configured that the code doesn't read.",
    );
    out.push("");
  }

  if (report.warnings.length > 0) {
    out.push("> **Warnings**");
    for (const w of report.warnings) out.push(`> - ${w}`);
    out.push("");
  }

  out.push(
    "<sub>EnvGuard · run <code>npx envguard scan</code> locally to reproduce.</sub>",
  );
  return out.join("\n");
}

function refList(f: Finding): string {
  if (f.references.length === 0) return "—";
  const shown = f.references
    .slice(0, 3)
    .map((r) => `\`${r.file}:${r.line}\``)
    .join(", ");
  const extra = f.references.length > 3 ? ` +${f.references.length - 3} more` : "";
  return shown + extra;
}
