import { patternsForExtension } from "./patterns";
import type { VarReference } from "../types";

/**
 * Extract every environment variable reference from a single file's contents.
 *
 * Scanning is line-oriented so that we get accurate line numbers and so a
 * shared (stateful) global regex can't leak `lastIndex` between files —
 * `String.prototype.matchAll` operates on a fresh internal copy each call.
 */
export function extractFromContent(
  content: string,
  ext: string,
  relPath: string,
): Map<string, VarReference[]> {
  const found = new Map<string, VarReference[]>();
  const patterns = patternsForExtension(ext);
  if (patterns.length === 0) return found;

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    for (const re of patterns) {
      for (const match of line.matchAll(re)) {
        const name = match[1];
        if (!name) continue;
        const refs = found.get(name) ?? [];
        refs.push({ file: relPath, line: i + 1 });
        found.set(name, refs);
      }
    }
  }
  return found;
}
