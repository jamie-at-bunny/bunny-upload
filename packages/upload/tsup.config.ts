import { defineConfig } from "tsup";

const shared = {
  format: ["esm", "cjs"] as const,
  dts: true,
  sourcemap: true,
  external: ["react", "zod"],
};

export default defineConfig([
  {
    ...shared,
    entry: { server: "src/server/index.ts", client: "src/client.ts" },
    clean: true,
  },
  {
    ...shared,
    entry: { react: "src/react.tsx" },
    external: [...shared.external, "@bunny.net/upload/client"],
    // Next.js App Router needs this to treat the components as client components.
    banner: { js: '"use client";' },
  },
]);
