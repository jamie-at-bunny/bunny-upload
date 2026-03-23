import { serveBunnyUpload } from "@bunny.net/upload-next";
import { createBunnyUploadHandler, UploadError } from "@bunny.net/upload-handler";

export const { POST } = serveBunnyUpload(
  createBunnyUploadHandler({
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
  })
);
