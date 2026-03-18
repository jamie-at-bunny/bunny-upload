# bunny-upload

Drop-in file uploads for [Bunny Storage](https://bunny.net/storage).

Bunny Storage gives you fast, affordable object storage with a global CDN — but getting files from a user's browser into your storage zone requires plumbing that every team rebuilds from scratch:

1. **No pre-signed URLs** — uploads must be proxied through your server to keep credentials safe
2. **The SDK is server-only** — `@bunny.net/storage-sdk` handles the Bunny Storage API, but there's nothing for the browser
3. **Upload UX is hard** — drag-and-drop, progress bars, validation, retries, error handling… every team builds this from scratch

`bunny-upload` handles everything between your user's browser and Bunny Storage.

## Quickstart (Next.js)

### 1. Install

```bash
npm install @bunny.net/upload-react @bunny.net/upload-handler @bunny.net/upload-next
```

### 2. Set environment variables

```env
BUNNY_STORAGE_ZONE=my-zone
BUNNY_STORAGE_PASSWORD=my-password
BUNNY_CDN_BASE=https://my-zone.b-cdn.net
```

### 3. Create a server route

```ts
// app/.bunny/upload/route.ts
import { serveBunnyUpload } from "@bunny.net/upload-next";
import { createBunnyUploadHandler } from "@bunny.net/upload-handler";

export const { POST } = serveBunnyUpload(
  createBunnyUploadHandler({
    restrictions: {
      maxFileSize: "10mb",
      allowedTypes: ["image/*"],
      maxFiles: 5,
    },
    getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
  })
);
```

### 4. Add the component

```tsx
"use client";

import { BunnyUpload } from "@bunny.net/upload-react";

export default function Page() {
  return (
    <BunnyUpload
      accept={["image/*"]}
      maxSize="10mb"
      maxFiles={5}
      onComplete={(files) => console.log("Uploaded:", files)}
    />
  );
}
```

That's it. Files are uploaded to `/.bunny/upload`, proxied to Bunny Storage, and your `onComplete` callback receives the CDN URLs.

## Packages

| Package | Description |
|---|---|
| [`@bunny.net/upload-core`](./packages/core) | Framework-agnostic upload engine |
| [`@bunny.net/upload-handler`](./packages/handler) | Server-side proxy to Bunny Storage |
| [`@bunny.net/upload-react`](./packages/react) | React hooks and drop-in component |
| [`@bunny.net/upload-vue`](./packages/vue) | Vue composable and drop-in component |
| [`@bunny.net/upload-next`](./packages/next) | Next.js App Router adapter |
| [`@bunny.net/upload-nuxt`](./packages/nuxt) | Nuxt server route adapter |
| [`@bunny.net/upload-angular`](./packages/angular) | Angular service and standalone component |

## Examples

See the [`examples/`](./examples) directory for working demos with Next.js, Nuxt, Vue, Angular, React Router, TanStack Start, Hono, and vanilla HTML.

## How it works

```
Browser                          Your Server                    Bunny Storage
┌──────────────┐  POST /.bunny/upload  ┌──────────────┐  SDK upload   ┌──────────────┐
│  @bunny-upload│ ───────────────────> │  @bunny-upload│ ──────────> │              │
│  /react      │ <─────────────────── │  /handler     │ <────────── │  Bunny CDN   │
│  /vue        │  { url, name, size } │  /next /nuxt  │  ✓ stored   │              │
│  /angular    │                      │               │             │              │
└──────────────┘                      └──────────────┘             └──────────────┘
```

The client sends files to your own server (same-origin, so cookies are included automatically). The handler validates the request, streams files to Bunny Storage using `@bunny.net/storage-sdk`, and returns the CDN URLs.

## Auth

Since uploads go to your own server, the browser sends cookies automatically. Use `onBeforeUpload` to validate the session:

```ts
createBunnyUploadHandler({
  onBeforeUpload: async (_file, req) => {
    const cookie = req.headers.get("cookie");
    const session = await getSession(cookie);
    if (!session) throw new UploadError("Unauthorized", 401);
  },
});
```

## Configuration

See [`@bunny.net/upload-handler`](./packages/handler) for all server-side options and [`@bunny.net/upload-core`](./packages/core) for client-side options.

## License

MIT
