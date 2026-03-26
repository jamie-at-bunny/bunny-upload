import { serveBunnyUpload } from "@bunny.net/upload-next";
import { createBunnyUploadHandler } from "@bunny.net/upload-handler";

export const { POST } = serveBunnyUpload(
  createBunnyUploadHandler({
    restrictions: {
      maxFileSize: "10mb",
      allowedTypes: ["image/*"],
      maxFiles: 5,
    },
    getPath: (file, req) => {
      const url = new URL(req.url);
      const dir = url.searchParams.get("dir") || "/";
      return `${dir.replace(/\/$/, "")}/${file.name}`;
    },
  })
);
