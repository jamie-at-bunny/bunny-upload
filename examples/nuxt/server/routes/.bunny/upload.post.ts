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
    onBeforeUpload: (_file, req) => {
      // The browser sends cookies automatically for same-origin requests.
      // Use onBeforeUpload to validate the session before allowing uploads.
      const cookie = req.headers.get("cookie");

      if (!cookie?.includes("session=")) {
        throw new UploadError("Unauthorized", 401);
      }

      // Validate the session however you like — nuxt-auth, lucia, etc.
      // const session = await getSession(cookie);
    },
  })
);
