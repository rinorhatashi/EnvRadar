/**
 * Language-specific patterns for extracting environment variable references.
 *
 * Each pattern is a global regex whose first capture group is the variable
 * name. Patterns are intentionally simple and line-oriented: they match the
 * common, idiomatic access forms for each language rather than attempting a
 * full parse. Adding a language means adding an entry here.
 */

export interface LanguagePattern {
  language: string;
  extensions: string[];
  patterns: RegExp[];
}

/** A permissive identifier — env var names are usually UPPER_SNAKE but not always. */
const IDENT = "[A-Za-z_][A-Za-z0-9_]*";
/** Anything between quotes that isn't a quote. */
const KEY = "[^'\"]+";

export const LANGUAGE_PATTERNS: LanguagePattern[] = [
  {
    language: "javascript",
    extensions: [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"],
    patterns: [
      // Dot access:    process.env.FOO
      new RegExp(`process\\.env\\.(${IDENT})`, "g"),
      // Bracket access: process.env['FOO'] / process.env["FOO"]
      new RegExp(`process\\.env\\[\\s*['"](${KEY})['"]\\s*\\]`, "g"),
      // Vite-style:    import.meta.env.FOO
      new RegExp(`import\\.meta\\.env\\.(${IDENT})`, "g"),
    ],
  },
  {
    language: "python",
    extensions: [".py"],
    patterns: [
      // os.environ['FOO'] / environ["FOO"]
      new RegExp(`(?:os\\.)?environ\\[\\s*['"](${KEY})['"]\\s*\\]`, "g"),
      // os.environ.get('FOO') / environ.get("FOO")
      new RegExp(`(?:os\\.)?environ\\.get\\(\\s*['"](${KEY})['"]`, "g"),
      // os.getenv('FOO') / getenv("FOO")
      new RegExp(`(?:os\\.)?getenv\\(\\s*['"](${KEY})['"]`, "g"),
    ],
  },
  {
    language: "ruby",
    extensions: [".rb", ".erb", ".rake"],
    patterns: [
      // ENV['FOO'] / ENV["FOO"]
      new RegExp(`ENV\\[\\s*['"](${KEY})['"]\\s*\\]`, "g"),
      // ENV.fetch('FOO') / ENV.fetch("FOO")
      new RegExp(`ENV\\.fetch\\(\\s*['"](${KEY})['"]`, "g"),
    ],
  },
  {
    language: "go",
    extensions: [".go"],
    patterns: [
      // os.Getenv("FOO")
      new RegExp(`os\\.Getenv\\(\\s*"(${KEY})"\\s*\\)`, "g"),
      // os.LookupEnv("FOO")
      new RegExp(`os\\.LookupEnv\\(\\s*"(${KEY})"\\s*\\)`, "g"),
    ],
  },
  {
    language: "rust",
    extensions: [".rs"],
    patterns: [
      // std::env::var("FOO") / env::var("FOO") / std::env::var_os("FOO")
      new RegExp(`(?:std::)?env::var(?:_os)?\\(\\s*"(${KEY})"\\s*\\)`, "g"),
    ],
  },
];

/** Every file extension EnvRadar knows how to scan. */
export const ALL_EXTENSIONS: string[] = [
  ...new Set(LANGUAGE_PATTERNS.flatMap((p) => p.extensions)),
];

/** The regexes that apply to a given file extension (empty if unsupported). */
export function patternsForExtension(ext: string): RegExp[] {
  const out: RegExp[] = [];
  for (const lp of LANGUAGE_PATTERNS) {
    if (lp.extensions.includes(ext)) out.push(...lp.patterns);
  }
  return out;
}
