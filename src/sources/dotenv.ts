import { readFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import type { SourceAdapter } from "./types";

/**
 * Reads variable names from a local `.env`-style file. Values are parsed only
 * to discover the set of keys; they are never stored or reported.
 */
export const dotenvAdapter: SourceAdapter = {
  id: "dotenv",
  async load(envName, config, root) {
    const rel = config.path ?? `.env.${envName}`;
    const abs = path.isAbsolute(rel) ? rel : path.join(root, rel);

    try {
      const content = await readFile(abs, "utf8");
      const parsed = dotenv.parse(content);
      return {
        name: envName,
        source: "dotenv",
        origin: rel,
        vars: new Set(Object.keys(parsed)),
        available: true,
      };
    } catch {
      return {
        name: envName,
        source: "dotenv",
        origin: rel,
        vars: new Set(),
        available: false,
      };
    }
  },
};
