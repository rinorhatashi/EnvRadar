import fg from "fast-glob";
import { ALL_EXTENSIONS } from "./patterns";

/** Directories that never contain first-party source worth scanning. */
const DEFAULT_EXCLUDE = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/coverage/**",
  "**/vendor/**",
  "**/target/**", // Rust build output
  "**/.venv/**",
  "**/venv/**",
  "**/__pycache__/**",
];

export interface WalkOptions {
  include?: string[];
  exclude?: string[];
}

/**
 * Return the source files to scan, relative to `root`. When no `include` globs
 * are given we match every supported extension; custom globs are still filtered
 * down to supported extensions by the caller.
 */
export async function walkSourceFiles(
  root: string,
  opts: WalkOptions = {},
): Promise<string[]> {
  const include =
    opts.include && opts.include.length > 0
      ? opts.include
      : ALL_EXTENSIONS.map((ext) => `**/*${ext}`);

  const ignore = [...DEFAULT_EXCLUDE, ...(opts.exclude ?? [])];

  return fg(include, {
    cwd: root,
    ignore,
    onlyFiles: true,
    dot: false,
    absolute: false,
    followSymbolicLinks: false,
    suppressErrors: true,
  });
}
