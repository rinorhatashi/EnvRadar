import { readFile } from "node:fs/promises";
import path from "node:path";
import { walkSourceFiles, type WalkOptions } from "./walk";
import { extractFromContent } from "./extract";
import { ALL_EXTENSIONS } from "./patterns";
import type { CodeScanResult, VarReference } from "../types";

export { ALL_EXTENSIONS } from "./patterns";

/**
 * Statically scan a codebase and return every environment variable it reads,
 * along with where it reads them.
 */
export async function scanCode(
  root: string,
  opts: WalkOptions = {},
): Promise<CodeScanResult> {
  const files = (await walkSourceFiles(root, opts)).filter((f) =>
    ALL_EXTENSIONS.includes(path.extname(f)),
  );

  const vars = new Map<string, VarReference[]>();
  let filesScanned = 0;

  // Read sequentially to keep file-descriptor pressure bounded on large repos.
  for (const rel of files) {
    let content: string;
    try {
      content = await readFile(path.join(root, rel), "utf8");
    } catch {
      continue;
    }
    filesScanned++;

    const fileVars = extractFromContent(content, path.extname(rel), rel);
    for (const [name, refs] of fileVars) {
      const existing = vars.get(name) ?? [];
      existing.push(...refs);
      vars.set(name, existing);
    }
  }

  return { vars, filesScanned };
}
