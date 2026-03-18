# @bunny.net/upload-nuxt

Nuxt server route adapter for [bunny-upload](../../README.md).

## Install

```bash
npm install @bunny.net/upload-vue @bunny.net/upload-handler @bunny.net/upload-nuxt
```

## Setup

### 1. Create the server route

```ts
// server/routes/.bunny/upload.post.ts
import { defineBunnyUploadHandler } from "@bunny.net/upload-nuxt";
import { createBunnyUploadHandler } from "@bunny.net/upload-handler";

export default defineBunnyUploadHandler(
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

```vue
<script setup lang="ts">
import { BunnyUpload, type UploadResult } from "@bunny.net/upload-vue";

function onComplete(files: UploadResult[]) {
  console.log("Uploaded:", files);
}
</script>

<template>
  <BunnyUpload
    :accept="['image/*']"
    max-size="10mb"
    :max-files="5"
    @complete="onComplete"
  />
</template>
```

## API

### `defineBunnyUploadHandler(handler)`

Wraps a handler function for use as a Nuxt server route. Converts between Nuxt's H3 events and standard `Request`/`Response`.

```ts
export default defineBunnyUploadHandler(handler);
```

The `handler` is any function with signature `(request: Request) => Promise<Response>` — typically from `createBunnyUploadHandler()`.

## Configuration

See [`@bunny.net/upload-handler`](../handler) for all server-side options and [`@bunny.net/upload-vue`](../vue) for client-side options.
