import { createBunnyUploadHandler } from "@bunny.net/upload-handler";
import { createFileManagerHandler } from "@bunny.net/file-manager-handler";

const uploadHandler = createBunnyUploadHandler({
  restrictions: {
    maxFileSize: "10mb",
    allowedTypes: ["image/*"],
    maxFiles: 5,
  },
  getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
});

const fileManagerHandler = createFileManagerHandler();

const server = Bun.serve({
  port: 3001,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/.bunny/upload" && request.method === "POST") {
      return uploadHandler(request);
    }

    if (url.pathname === "/.bunny/files") {
      return fileManagerHandler(request);
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Server running at http://localhost:${server.port}`);
