import { Hono } from "hono";
import { createUploadHandler } from "@bunny.net/upload/server";

const app = new Hono();

const upload = createUploadHandler({
  maxFileSize: "10mb",
  allowedTypes: ["image/*"],
  path: ({ file }) => `uploads/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`,
  // authorize: ({ request }) => request.headers.has("authorization"),
});

// The handler takes a Request and returns a Response, so pass it straight through.
app.post("/api/upload", (c) => upload(c.req.raw));

export default app;
