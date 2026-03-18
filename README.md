# bunny-upload

Bunny Storage gives you fast, affordable object storage with a global CDN — but getting files from a user's browser into your storage zone requires plumbing that every team rebuilds from scratch:

1. **No pre-signed URLs** — uploads must be proxied through your server to keep credentials safe
2. **The SDK is server-only** — `@bunny.net/storage-sdk` handles the Bunny Storage API, but there's nothing for the browser
3. **Upload UX is hard** — drag-and-drop, progress bars, validation, retries, error handling… every team builds this from scratch

You end up writing a server-side proxy route, a client-side upload manager with XHR for progress tracking, file validation on both sides, and UI for the whole flow. That's a lot of code between "I have a storage zone" and "my users can upload files."

## Usage

`bunny-upload` is a drop-in upload SDK that handles everything between your user's browser and Bunny Storage.

**Server** — a handler that proxies uploads to your storage zone using `@bunny.net/storage-sdk`:

```ts
// app/.bunny/upload/route.ts
import { createBunnyUploadHandler } from "@bunny-upload/handler";

const handler = createBunnyUploadHandler({
  restrictions: {
    maxFileSize: "10mb",
    allowedTypes: ["image/*"],
    maxFiles: 5,
  },
  getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
  onBeforeUpload: (_file, req) => {
    // Validate the session before allowing uploads
    const cookie = req.headers.get("cookie");
    if (!cookie?.includes("session=")) {
      throw new UploadError("Unauthorized", 401);
    }
  },
});

export const POST = (request: Request) => handler(request);
```

**Client** — a component with drag-and-drop, progress, validation, and retries built in:

```tsx
import { BunnyUpload } from "@bunny-upload/react";

export function AvatarUploader() {
  return (
    <BunnyUpload
      accept={["image/*"]}
      maxSize="10mb"
      maxFiles={1}
      onComplete={(files) => console.log(files[0].url)}
    />
  );
}
```

The component sends files to `/.bunny/upload` on your server, the handler validates and streams them to Bunny Storage, and your `onComplete` callback receives the CDN URLs.
