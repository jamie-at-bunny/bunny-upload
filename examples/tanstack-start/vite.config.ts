import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  server: { port: 3003 },
  plugins: [tsConfigPaths(), tanstackStart(), react()],
});
