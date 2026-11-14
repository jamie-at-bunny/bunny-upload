import { createUploadHandler } from "@bunny.net/upload/server";

export const POST = createUploadHandler({
  maxFileSize: "4mb", // Vercel caps request bodies at 4.5MB; use strategy: "presigned" for bigger files
  allowedTypes: ["image/*"],
  // authorize: async ({ request }) => Boolean(await getSession(request)),
});
