import { createBunnyUploadHandler, UploadError } from "@bunny.net/upload-handler";
import type { Route } from "./+types/upload";

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

// Resource route — action only, no UI
export async function action({ request }: Route.ActionArgs) {
  return handler(request);
}
