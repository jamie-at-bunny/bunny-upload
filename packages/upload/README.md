# @bunny.net/upload

File uploads to [Bunny Storage](https://bunny.net/storage) in two pieces: a server handler you mount on one route, and a client (or React button) that talks to it.

```bash
npm install @bunny.net/upload
```

```env
BUNNY_STORAGE_ZONE=my-zone
BUNNY_STORAGE_PASSWORD=storage-zone-password
BUNNY_CDN_BASE=https://my-zone.b-cdn.net
BUNNY_STORAGE_REGION=de          # optional: de, uk, ny, la, sg, se, br, jh, syd
```

## Server

`createUploadHandler()` returns `(request: Request) => Promise<Response>`. Mount it on `POST`.

**Next.js** (`app/api/upload/route.ts`)

```ts
import { createUploadHandler } from "@bunny.net/upload/server";

export const POST = createUploadHandler({
  maxFileSize: "4mb",
  allowedTypes: ["image/*"],
});
```

**Hono**

```ts
const upload = createUploadHandler();
app.post("/api/upload", (c) => upload(c.req.raw));
```

**React Router / Remix**

```ts
const upload = createUploadHandler();
export const action = ({ request }: ActionFunctionArgs) => upload(request);
```

**SvelteKit** (`src/routes/api/upload/+server.ts`)

```ts
const upload = createUploadHandler();
export const POST = ({ request }) => upload(request);
```

**Nuxt** (`server/api/upload.post.ts`)

```ts
const upload = createUploadHandler();
export default defineEventHandler((event) => upload(toWebRequest(event)));
```

**Bun / Deno / Bunny Edge Scripts**

```ts
const upload = createUploadHandler();
Bun.serve({ fetch: (req) => upload(req) });
```

### Options

| Option | Default | |
| --- | --- | --- |
| `maxFileSize` | none | Bytes or `"10mb"`, `"500kb"`, `"1.5gb"` |
| `allowedTypes` | any | MIME patterns, e.g. `["image/*", "application/pdf"]` |
| `authorize` | allow | `({ file, request }) => boolean`. Return `false` for a 403, or throw `UploadError(message, status)` |
| `path` | `uploads/<uuid>-<name>` | `({ file, request }) => string`. Paths containing `..` are rejected |
| `onComplete` | none | `({ file, request }) => void`. Runs once the file is in storage, e.g. to save it to your database |
| `strategy` | `"proxy"` | `"proxy"` or `"presigned"`. See below |
| `storageZone`, `storagePassword`, `cdnBase`, `region` | env | Override the env vars |
| `secret` | `BUNNY_UPLOAD_SECRET`, falling back to the storage password | Signs upload tokens |
| `tokenTtl` | `3600` | Seconds a client has to finish an upload |
| `endpointUrl` | `BUNNY_ENDPOINT_URL` | Custom S3 endpoint for presigned uploads |

Options are validated with Zod when the handler is created, so a missing env var or a bad `maxFileSize` fails at startup with a readable message.

### Proxy vs presigned

- **`proxy`** (default): the file goes through your server, which streams it to Bunny Storage. Works in every region. Serverless platforms cap request bodies (4.5MB on Vercel), so keep `maxFileSize` under that or switch strategies.
- **`presigned`**: the browser uploads straight to Bunny's S3-compatible API with a URL that signs the exact size and content type. Needs a storage zone with S3 enabled in `de`, `ny` or `sg`. After the upload, the handler checks the object exists at the right size before calling `onComplete`.

The client works with either strategy, so you can switch without changing any frontend code.

## React

```tsx
"use client";
import { UploadButton } from "@bunny.net/upload/react";

<UploadButton
  accept="image/*"
  onComplete={(files) => console.log(files[0].url)}
  onError={(err) => alert(err.message)}
/>
```

The button is unstyled. Pass `className`, and style states with `[data-status="uploading"]`, `"success"` or `"error"`. `children` can be a function of `{ status, progress, results, error }`.

For your own UI, use the hook:

```tsx
const { upload, status, progress, results, error, abort, reset } = useUpload({ endpoint: "/api/upload" });

<input type="file" onChange={(e) => upload(e.target.files!)} />
{status === "uploading" && <progress value={progress} max={100} />}
```

## Any other framework

```ts
import { upload } from "@bunny.net/upload/client";

const result = await upload(file, {
  endpoint: "/api/upload",
  onProgress: ({ percent }) => console.log(percent),
  signal: controller.signal,
});
// { name, path, size, type, url }
```

Network errors and 5xx responses are retried twice. Validation and auth errors (4xx) fail immediately, with the server's message on `error.message` and the status code on `error.status`.

## How it works

1. The client POSTs `{ action: "init", file: { name, size, type } }`. The server validates it, runs `authorize` and `path`, and returns a signed, short-lived token.
2. The client sends the bytes, either to your handler with the token in the `x-bunny-upload-token` header (proxy) or to the presigned URL.
3. The server verifies the token and checks the byte count. For presigned uploads the client then POSTs `{ action: "complete", token }` and the server HEADs the object before running `onComplete`.

The name, path, size and type in `onComplete` come from the signed token, not from the client.
