import { createBunnyUploadHandler, UploadError } from "@bunny.net/upload-handler";
import { createFileManagerHandler, FileManagerError } from "@bunny.net/file-manager-handler";
import { resolve } from "node:path";

const uploadHandler = createBunnyUploadHandler({
  restrictions: {
    maxFileSize: "10mb",
    allowedTypes: ["image/*"],
    maxFiles: 5,
  },
  getPath: (file, req) => {
    const url = new URL(req.url);
    const folder = url.searchParams.get("folder") || "/uploads";
    return `${folder.replace(/\/$/, "")}/${file.name}`;
  },
  // Uncomment to require auth:
  // onBeforeUpload: (_file, req) => {
  //   const cookie = req.headers.get("cookie");
  //   if (!cookie?.includes("session=")) {
  //     throw new UploadError("Unauthorized", 401);
  //   }
  // },
});

const fileManagerHandler = createFileManagerHandler({
  // Uncomment to require auth:
  // onBeforeList: (path, req) => {
  //   const cookie = req.headers.get("cookie");
  //   if (!cookie?.includes("session=")) {
  //     throw new FileManagerError("Unauthorized", 401);
  //   }
  // },
});

const publicDir = resolve(import.meta.dir, "../public");
const coreDistDir = resolve(import.meta.dir, "../../..", "packages/core/dist");
const fmCoreDistDir = resolve(import.meta.dir, "../../..", "packages/file-manager-core/dist");

const server = Bun.serve({
  port: 3002,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/.bunny/upload" && request.method === "POST") {
      return uploadHandler(request);
    }

    if (url.pathname === "/.bunny/files") {
      return fileManagerHandler(request);
    }

    // Serve the IIFE bundle from @bunny.net/upload-core
    if (url.pathname === "/bunny-upload.js") {
      const file = Bun.file(resolve(coreDistDir, "index.global.js"));
      return new Response(file, {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    // Serve the file-manager-core ESM bundle
    if (url.pathname === "/bunny-file-manager.js") {
      const file = Bun.file(resolve(fmCoreDistDir, "index.js"));
      return new Response(file, {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    // Serve file browser page
    if (url.pathname === "/files") {
      const file = Bun.file(resolve(publicDir, "files.html"));
      return new Response(file, {
        headers: { "Content-Type": "text/html" },
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
