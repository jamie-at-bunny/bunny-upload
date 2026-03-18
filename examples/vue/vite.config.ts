import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/.bunny": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
