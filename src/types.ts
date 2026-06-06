/**
 * Core data model shared across EnvGuard's scan, source, compare and report
 * layers. Keeping these in one place makes the data flow easy to follow:
 *
 *   scanCode()            -> CodeScanResult   (what the code reads)
 *   resolveEnvironments() -> EnvironmentVars[] (what each environment provides)
 *   buildReport()         -> Report            (the cross-environment matrix)
 */

/** Classification for a single variable in the final report. */
export type Status = "MISSING" | "PARITY" | "DEAD" | "OK";

/** A single place in the source tree where a variable is read. */
export interface VarReference {
  /** Path relative to the scanned root. */
  file: string;
  /** 1-based line number. */
  line: number;
}

/** Result of statically scanning a codebase for env var usage. */
export interface CodeScanResult {
  /** Variable name -> every place the code reads it. */
  vars: Map<string, VarReference[]>;
  /** How many source files were read. */
  filesScanned: number;
}

/** The set of variable names a single environment provides. */
export interface EnvironmentVars {
  /** Environment name, e.g. "staging". */
  name: string;
  /** Source adapter id that produced this, e.g. "dotenv". */
  source: string;
  /** Human-readable origin, e.g. ".env.staging". */
  origin: string;
  /** Variable names configured in this environment. */
  vars: Set<string>;
  /** Whether the source was read successfully. */
  available: boolean;
}

/** One variable's verdict across code and every environment. */
export interface Finding {
  name: string;
  status: Status;
  /** Whether any scanned file reads this variable. */
  inCode: boolean;
  /** Where the code reads it (empty for DEAD vars). */
  references: VarReference[];
  /** Environment name -> present in that environment? */
  presence: Record<string, boolean>;
}

/** The complete report produced by a scan. */
export interface Report {
  generatedAt: string;
  root: string;
  environments: string[];
  summary: Record<Status, number>;
  findings: Finding[];
  warnings: string[];
}

/** Per-environment configuration in envguard.yml. */
export interface EnvironmentConfig {
  /** Source adapter id. Defaults to "dotenv". */
  source?: string;
  /** dotenv: path to the .env file (relative to the scanned root). */
  path?: string;
}

/** Parsed envguard.yml. Every field is optional. */
export interface EnvguardConfig {
  environments?: Record<string, EnvironmentConfig>;
  ignore?: {
    /** Vars allowed to differ across environments (no PARITY alert). */
    parity?: string[];
    /** Vars allowed to be configured but unused (no DEAD alert). */
    dead?: string[];
    /** Vars the code reads that no environment must provide (no MISSING alert). */
    missing?: string[];
  };
  scan?: {
    /** Globs to scan. Defaults to every supported source file under the root. */
    include?: string[];
    /** Globs to skip, in addition to the built-in defaults. */
    exclude?: string[];
  };
  /** Statuses that make `envguard scan` exit non-zero. Defaults to MISSING + PARITY. */
  failOn?: Status[];
}
