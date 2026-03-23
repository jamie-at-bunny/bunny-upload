import { serveBunnyFileManager } from "@bunny.net/upload-next";
import { createFileManagerHandler } from "@bunny.net/file-manager-handler";

export const { GET, POST, DELETE } = serveBunnyFileManager(
  createFileManagerHandler({
    // Uncomment to require auth:
    // onBeforeList: (path, req) => {
    //   const cookie = req.headers.get("cookie");
    //   if (!cookie?.includes("session=")) {
    //     throw new FileManagerError("Unauthorized", 401);
    //   }
    // },
  })
);
