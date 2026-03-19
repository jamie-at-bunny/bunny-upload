import { defineBunnyUploadHandler } from "@bunny.net/upload-nuxt";
import { createBunnyUploadHandler, UploadError } from "@bunny.net/upload-handler";

export default defineBunnyUploadHandler(
  createBunnyUploadHandler({
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
  })
);
