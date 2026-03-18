# @bunny.net/upload-next

Next.js App Router adapter for [bunny-upload](../../README.md).

## Install

```bash
npm install @bunny.net/upload-react @bunny.net/upload-handler @bunny.net/upload-next
```

## Setup

### 1. Create the upload route

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

### 2. Add environment variables

```env
BUNNY_STORAGE_ZONE=my-zone
BUNNY_STORAGE_PASSWORD=my-password
BUNNY_CDN_BASE=https://my-zone.b-cdn.net
```

### 3. Add the component

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

## API

### `serveBunnyUpload(handler)`

Wraps a handler function for use as a Next.js App Router route handler. Returns `{ POST }`.

```ts
const { POST } = serveBunnyUpload(handler);
```

The `handler` is any function with signature `(request: Request) => Promise<Response>` — typically from `createBunnyUploadHandler()`.

## Configuration

See [`@bunny.net/upload-handler`](../handler) for all server-side options and [`@bunny.net/upload-react`](../react) for client-side options.
