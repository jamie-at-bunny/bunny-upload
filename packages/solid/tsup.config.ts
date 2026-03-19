import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["solid-js"],
  esbuildOptions(options) {
    options.jsx = "preserve";
  },
});
