import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { createBunnyUploadHandler, UploadError } from "@bunny.net/upload-handler";

const uploadHandler = createBunnyUploadHandler({
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

const startHandler = createStartHandler(defaultStreamHandler);

export default {
  async fetch(request: Request, ...args: any[]) {
    const url = new URL(request.url);

    // Handle upload requests before TanStack Start
    if (
      url.pathname === "/.bunny/upload" &&
      request.method === "POST"
    ) {
      return uploadHandler(request);
    }

    return startHandler.fetch(request, ...args);
  },
};
