import { createBunnyUploadHandler, UploadError } from "@bunny.net/upload-handler";
import { resolve } from "node:path";

const handler = createBunnyUploadHandler({
  restrictions: {
    maxFileSize: "10mb",
    allowedTypes: ["image/*"],
    maxFiles: 5,
  },
  getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
  // Uncomment to require auth:
  // onBeforeUpload: (_file, req) => {
  //   const cookie = req.headers.get("cookie");
  //   if (!cookie?.includes("session=")) {
  //     throw new UploadError("Unauthorized", 401);
  //   }
  // },
});

const publicDir = resolve(import.meta.dir, "../public");
const coreDistDir = resolve(import.meta.dir, "../../..", "packages/core/dist");

const server = Bun.serve({
  port: 3002,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/.bunny/upload" && request.method === "POST") {
      return handler(request);
    }

    // Serve the IIFE bundle from @bunny.net/upload-core
    if (url.pathname === "/bunny-upload.js") {
      const file = Bun.file(resolve(coreDistDir, "index.global.js"));
      return new Response(file, {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    // Serve index.html
    const file = Bun.file(resolve(publicDir, "index.html"));
    return new Response(file, {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`Vanilla example running at http://localhost:${server.port}`);
