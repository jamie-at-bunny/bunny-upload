import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/.bunny": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
