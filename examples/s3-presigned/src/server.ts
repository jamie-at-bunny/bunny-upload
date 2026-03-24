import { createBunnyUploadHandler } from "@bunny.net/upload-handler";

const handler = createBunnyUploadHandler({
  restrictions: {
    maxFileSize: "10mb",
    allowedTypes: ["image/*"],
    maxFiles: 5,
  },
  getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
  onAfterUpload: (result) => {
    console.log("Upload complete:", result.url);
  },
});

const server = Bun.serve({
  port: 3001,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/.bunny/upload" && request.method === "POST") {
      return handler(request);
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`S3 presigned upload server running at http://localhost:${server.port}`);
