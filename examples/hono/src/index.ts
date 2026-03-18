import { Hono } from "hono";
import { createBunnyUploadHandler, UploadError } from "@bunny-upload/handler";

const app = new Hono();

const handler = createBunnyUploadHandler({
  restrictions: {
    maxFileSize: "10mb",
    allowedTypes: ["image/*"],
    maxFiles: 5,
  },
  getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
  onBeforeUpload: (_file, req) => {
    const cookie = req.headers.get("cookie");

    if (!cookie?.includes("session=")) {
      throw new UploadError("Unauthorized", 401);
    }
  },
});

// The handler takes a Request and returns a Response — pass it straight through
app.post("/.bunny/upload", (c) => handler(c.req.raw));

export default app;
