import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  platform: "node",
  clean: true,
  sourcemap: false,
  dts: false,
  // The shebang in src/index.ts is preserved and the output is marked executable.
  shims: false,
});
