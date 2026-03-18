import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  {
    entry: ["src/index.ts"],
    format: ["iife"],
    globalName: "BunnyUpload",
    outDir: "dist",
    minify: true,
    sourcemap: true,
  },
]);
