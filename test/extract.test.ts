import { describe, it, expect } from "vitest";
import { extractFromContent } from "../src/scan/extract";

function names(content: string, ext: string): string[] {
  return [...extractFromContent(content, ext, `file${ext}`).keys()].sort();
}

describe("extractFromContent", () => {
  it("extracts Node/TypeScript process.env usage", () => {
    const src = `
      const a = process.env.DATABASE_URL;
      const b = process.env['STRIPE_KEY'];
      const c = process.env["REDIS_URL"];
      const d = import.meta.env.VITE_PUBLIC_URL;
    `;
    expect(names(src, ".ts")).toEqual([
      "DATABASE_URL",
      "REDIS_URL",
      "STRIPE_KEY",
      "VITE_PUBLIC_URL",
    ]);
  });

  it("extracts Python os.environ / getenv usage", () => {
    const src = [
      "import os",
      "DATABASE_URL = os.environ['DATABASE_URL']",
      "api = os.getenv('API_KEY')",
      'redis = os.environ.get("REDIS_URL")',
      "from os import environ",
      "x = environ['PLAIN_ENVIRON']",
    ].join("\n");
    expect(names(src, ".py")).toEqual([
      "API_KEY",
      "DATABASE_URL",
      "PLAIN_ENVIRON",
      "REDIS_URL",
    ]);
  });

  it("extracts Ruby ENV usage", () => {
    const src = `key = ENV['SENDGRID_API_KEY']\ndb = ENV.fetch("DATABASE_URL")`;
    expect(names(src, ".rb")).toEqual(["DATABASE_URL", "SENDGRID_API_KEY"]);
  });

  it("extracts Go os.Getenv / os.LookupEnv usage", () => {
    const src = `db := os.Getenv("DATABASE_URL")\nv, ok := os.LookupEnv("FEATURE_FLAG")`;
    expect(names(src, ".go")).toEqual(["DATABASE_URL", "FEATURE_FLAG"]);
  });

  it("extracts Rust std::env::var usage", () => {
    const src = `let db = std::env::var("DATABASE_URL").unwrap();\nlet p = env::var("PORT").ok();`;
    expect(names(src, ".rs")).toEqual(["DATABASE_URL", "PORT"]);
  });

  it("records file and line references", () => {
    const src = "line1\nconst x = process.env.TOKEN;\n";
    const refs = extractFromContent(src, ".ts", "src/app.ts").get("TOKEN");
    expect(refs).toEqual([{ file: "src/app.ts", line: 2 }]);
  });

  it("ignores unsupported extensions", () => {
    expect(names("process.env.NOPE", ".txt")).toEqual([]);
  });
});
