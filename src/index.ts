#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { Command } from "commander";
import { runScan } from "./commands/scan";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

const program = new Command();

program
  .name("envguard")
  .description(
    "Inventory the environment variables your code expects and check them against every environment.",
  )
  .version(pkg.version, "-v, --version", "print the EnvGuard version");

program
  .command("scan", { isDefault: true })
  .description(
    "Scan source for env var usage and compare it against every configured environment.",
  )
  .argument("[path]", "directory to scan", ".")
  .option("-c, --config <file>", "path to an envguard.yml config file")
  .option("-f, --format <format>", "output format: table | json | markdown", "table")
  .option("-o, --output <file>", "write the report to a file instead of stdout")
  .option(
    "--fail-on <list>",
    "comma-separated statuses that cause a non-zero exit: missing, parity, dead, none",
  )
  .option("--no-color", "disable colored output")
  .action(async (pathArg: string, opts) => {
    try {
      process.exitCode = await runScan(pathArg, {
        config: opts.config,
        format: opts.format,
        output: opts.output,
        failOn: opts.failOn,
        color: opts.color,
      });
    } catch (err) {
      process.stderr.write(`envguard: ${(err as Error).message}\n`);
      process.exitCode = 2;
    }
  });

program.parseAsync(process.argv);
