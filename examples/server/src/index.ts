import { createBunnyUploadHandler, UploadError } from "@bunny.net/upload-handler";

const handler = createBunnyUploadHandler({
  restrictions: {
    maxFileSize: "10mb",
    allowedTypes: ["image/*"],
    maxFiles: 5,
  },
  getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
  // onBeforeUpload: (_file, req) => {
  //   const cookie = req.headers.get("cookie");

  //   if (!cookie?.includes("session=")) {
  //     throw new UploadError("Unauthorized", 401);
  //   }
  // },
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

console.log(`Upload server running at http://localhost:${server.port}`);
