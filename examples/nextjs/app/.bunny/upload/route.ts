import { serveBunnyUpload } from "@bunny-upload/next";
import { createBunnyUploadHandler, UploadError } from "@bunny-upload/handler";

export const { POST } = serveBunnyUpload(
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

      // Validate the session however you like — next-auth, lucia, etc.
      // const session = await getSession(cookie);
    },
  })
);
