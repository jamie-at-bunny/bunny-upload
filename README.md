# bunny-upload

Drop-in file uploads for [Bunny Storage](https://bunny.net/storage).

Bunny Storage gives you fast, affordable object storage with a global CDN — but getting files from a user's browser into your storage zone requires plumbing that every team rebuilds from scratch:

1. **No pre-signed URLs** — uploads must be proxied through your server to keep credentials safe
2. **The SDK is server-only** — `@bunny.net/storage-sdk` handles the Bunny Storage API, but there's nothing for the browser
3. **Upload UX is hard** — drag-and-drop, progress bars, validation, retries, error handling… every team builds this from scratch

`bunny-upload` handles everything between your user's browser and Bunny Storage.

## Quickstart

Every setup needs two things: a **server handler** (proxies uploads to Bunny Storage) and a **client component** (handles the UI). Install `@bunny.net/upload` (bundles both client engine + server handler) plus your framework package. Pick your framework below.

### Environment variables

All frameworks use the same env vars:

```env
BUNNY_STORAGE_ZONE=my-zone
BUNNY_STORAGE_PASSWORD=my-password
BUNNY_CDN_BASE=https://my-zone.b-cdn.net
```

<details>
<summary><strong>Next.js</strong></summary>

```bash
npm install @bunny.net/upload @bunny.net/upload-react @bunny.net/upload-next
```

**Server** — `app/.bunny/upload/route.ts`

```ts
import { serveBunnyUpload } from "@bunny.net/upload-next";
import { createBunnyUploadHandler } from "@bunny.net/upload";

export const { POST } = serveBunnyUpload(
  createBunnyUploadHandler({
    restrictions: { maxFileSize: "10mb", allowedTypes: ["image/*"], maxFiles: 5 },
    getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
  })
);
```

**Client** — any client component

```tsx
"use client";
import { BunnyUpload } from "@bunny.net/upload-react";

export default function Page() {
  return <BunnyUpload accept={["image/*"]} maxSize="10mb" maxFiles={5} onComplete={(files) => console.log(files)} />;
}
```

[Full example →](./examples/nextjs)

</details>

<details>
<summary><strong>Nuxt</strong></summary>

```bash
npm install @bunny.net/upload @bunny.net/upload-vue @bunny.net/upload-nuxt
```

**Server** — `server/routes/.bunny/upload.post.ts`

```ts
import { defineBunnyUploadHandler } from "@bunny.net/upload-nuxt";
import { createBunnyUploadHandler } from "@bunny.net/upload";

export default defineBunnyUploadHandler(
  createBunnyUploadHandler({
    restrictions: { maxFileSize: "10mb", allowedTypes: ["image/*"], maxFiles: 5 },
    getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
  })
);
```

**Client** — `app.vue` or any component

```vue
<script setup>
import { BunnyUpload } from "@bunny.net/upload-vue";
</script>

<template>
  <BunnyUpload :accept="['image/*']" max-size="10mb" :max-files="5" @complete="console.log" />
</template>
```

[Full example →](./examples/nuxt)

</details>

<details>
<summary><strong>Vue</strong></summary>

```bash
npm install @bunny.net/upload @bunny.net/upload-vue
```

You'll need a backend server (Express, Hono, Fastify, etc.) to handle uploads. The handler works with any framework that supports standard `Request`/`Response`.

**Client**

```vue
<script setup>
import { BunnyUpload } from "@bunny.net/upload-vue";
</script>

<template>
  <BunnyUpload :accept="['image/*']" max-size="10mb" :max-files="5" @complete="console.log" />
</template>
```

[Full example →](./examples/vue)

</details>

<details>
<summary><strong>React Router</strong></summary>

```bash
npm install @bunny.net/upload @bunny.net/upload-react
```

**Server** — `app/routes/upload.tsx` (action)

```ts
import { createBunnyUploadHandler } from "@bunny.net/upload";

const handler = createBunnyUploadHandler({
  restrictions: { maxFileSize: "10mb", allowedTypes: ["image/*"], maxFiles: 5 },
  getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
});

export async function action({ request }: { request: Request }) {
  return handler(request);
}
```

**Client**

```tsx
import { BunnyUpload } from "@bunny.net/upload-react";

export default function Home() {
  return <BunnyUpload accept={["image/*"]} maxSize="10mb" maxFiles={5} onComplete={(files) => console.log(files)} />;
}
```

[Full example →](./examples/react-router)

</details>

<details>
<summary><strong>TanStack Start</strong></summary>

```bash
npm install @bunny.net/upload @bunny.net/upload-react
```

**Client**

```tsx
import { BunnyUpload } from "@bunny.net/upload-react";

export default function Home() {
  return <BunnyUpload accept={["image/*"]} maxSize="10mb" maxFiles={5} onComplete={(files) => console.log(files)} />;
}
```

[Full example →](./examples/tanstack-start)

</details>

<details>
<summary><strong>SolidStart</strong></summary>

```bash
npm install @bunny.net/upload-solid @bunny.net/upload
```

**Server** — `src/routes/.bunny/upload.ts`

```ts
import type { APIEvent } from "@solidjs/start/server";
import { createBunnyUploadHandler } from "@bunny.net/upload";

const handler = createBunnyUploadHandler({
  restrictions: { maxFileSize: "10mb", allowedTypes: ["image/*"], maxFiles: 5 },
  getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
});

export async function POST(event: APIEvent) {
  return handler(event.request);
}
```

**Client**

```tsx
import { BunnyUpload } from "@bunny.net/upload-solid";

export default function Home() {
  return <BunnyUpload accept={["image/*"]} maxSize="10mb" onComplete={(files) => console.log(files)} />;
}
```

[Full example →](./examples/solidstart)

</details>

<details>
<summary><strong>Angular</strong></summary>

```bash
npm install @bunny.net/upload-angular
```

You'll need a backend server to handle uploads (see Hono or vanilla server examples).

**Client**

```ts
import { Component } from "@angular/core";
import { BunnyUploadComponent } from "@bunny.net/upload-angular";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [BunnyUploadComponent],
  template: `<bunny-upload [accept]="['image/*']" maxSize="10mb" [maxFiles]="5" (completed)="onComplete($event)" />`,
})
export class AppComponent {
  onComplete(files: any[]) { console.log(files); }
}
```

[Full example →](./examples/angular)

</details>

<details>
<summary><strong>Hono</strong></summary>

```bash
npm install @bunny.net/upload hono
```

```ts
import { Hono } from "hono";
import { createBunnyUploadHandler } from "@bunny.net/upload";

const app = new Hono();

const handler = createBunnyUploadHandler({
  restrictions: { maxFileSize: "10mb", allowedTypes: ["image/*"], maxFiles: 5 },
  getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
});

app.post("/.bunny/upload", (c) => handler(c.req.raw));

export default app;
```

[Full example →](./examples/hono)

</details>

<details>
<summary><strong>Vanilla HTML + JS</strong></summary>

```bash
npm install @bunny.net/upload
```

No framework needed. Use `createDropzone` to attach drag-and-drop to any element:

```html
<div id="dropzone">Drop files here or click to browse</div>
<script src="/bunny-upload.js"></script>
<script>
  const dropzone = BunnyUpload.createDropzone(document.getElementById("dropzone"), {
    restrictions: { allowedTypes: ["image/*"], maxFileSize: "10mb" },
    onDragOver: (isDragOver) => {
      document.getElementById("dropzone").classList.toggle("active", isDragOver);
    },
    onComplete: (files) => console.log("Uploaded:", files),
  });

  document.getElementById("dropzone").addEventListener("click", () => dropzone.openFilePicker());
</script>
```

[Full example →](./examples/vanilla)

</details>

## Components

Each framework package provides three levels of control:

### Drop-in component

Everything included — drag-and-drop zone, file list, progress bars, error states, retry.

```tsx
<BunnyUpload accept={["image/*"]} maxSize="10mb" maxFiles={5} onComplete={(files) => console.log(files)} />
```

### Custom dropzone

Full control over the UI. You provide the markup, we handle the behaviour.

```tsx
<UploadDropzone accept={["image/*"]} maxSize="10mb" onComplete={(files) => console.log(files)}>
  {({ isDragOver, openFilePicker, files, getDropzoneProps, getInputProps }) => (
    <div {...getDropzoneProps()} onClick={openFilePicker}>
      <input {...getInputProps()} />
      <p>{isDragOver ? "Drop!" : "Drag files here"}</p>
      {files.map((f) => <div key={f.id}>{f.name} — {f.progress}%</div>)}
    </div>
  )}
</UploadDropzone>
```

### Headless hook/composable

Maximum flexibility — just the state and methods, zero UI.

```tsx
const { files, addFiles, upload, reset, isUploading } = useBunnyUpload({
  accept: ["image/*"],
  maxSize: "10mb",
});
```

## Packages

| Package | Description |
|---|---|
| [`@bunny.net/upload`](./packages/upload) | Meta-package — re-exports both client engine and server handler |
| [`@bunny.net/upload-core`](./packages/core) | Framework-agnostic upload engine and `createDropzone` |
| [`@bunny.net/upload-handler`](./packages/handler) | Server-side proxy to Bunny Storage |
| [`@bunny.net/upload-react`](./packages/react) | React hooks, component, and `UploadDropzone` |
| [`@bunny.net/upload-vue`](./packages/vue) | Vue composable, component, and `UploadDropzone` |
| [`@bunny.net/upload-next`](./packages/next) | Next.js App Router adapter |
| [`@bunny.net/upload-nuxt`](./packages/nuxt) | Nuxt server route adapter |
| [`@bunny.net/upload-solid`](./packages/solid) | SolidJS primitive, component, and `UploadDropzone` |
| [`@bunny.net/upload-angular`](./packages/angular) | Angular service, component, and `bunnyDropzone` directive |

## How it works

```
Browser                        Your Server                   Bunny Storage
┌────────────────┐  POST /.bunny/upload  ┌───────────────┐  SDK upload  ┌──────────────┐
│ @bunny.net/    │ ────────────────────> │ @bunny.net/   │ ──────────> │              │
│ upload-react   │ <──────────────────── │ upload-handler │ <────────── │  Bunny CDN   │
│ upload-vue     │  { url, name, size }  │ upload-next   │  ✓ stored   │              │
│ upload-solid   │                       │ upload-nuxt   │             │              │
│ upload-angular │                       │               │             │              │
└────────────────┘                       └───────────────┘             └──────────────┘
```

The client sends files to your own server (same-origin, so cookies are included automatically). The handler validates the request, streams files to Bunny Storage using `@bunny.net/storage-sdk`, and returns the CDN URLs.

## Auth

Since uploads go to your own server, the browser sends cookies automatically. Use `onBeforeUpload` to validate the session:

```ts
import { createBunnyUploadHandler, UploadError } from "@bunny.net/upload";

createBunnyUploadHandler({
  onBeforeUpload: async (_file, req) => {
    const cookie = req.headers.get("cookie");
    const session = await getSession(cookie);
    if (!session) throw new UploadError("Unauthorized", 401);
  },
});
```

## Configuration

See [`@bunny.net/upload`](./packages/upload) for all server-side options (`getPath`, `onBeforeUpload`, `onAfterUpload`, storage regions) and client-side options (restrictions, events, utilities).

## License

MIT
