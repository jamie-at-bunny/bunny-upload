# @bunny.net/upload

Drop-in file uploads for [Bunny Storage](https://bunny.net/storage). This is the main package — it re-exports everything from both the client engine ([`@bunny.net/upload-core`](../core)) and the server handler ([`@bunny.net/upload-handler`](../handler)), so one install gives you everything you need.

## Install

```bash
npm install @bunny.net/upload
```

## Environment variables

The server handler reads credentials from environment variables automatically:

```env
BUNNY_STORAGE_ZONE=my-zone
BUNNY_STORAGE_PASSWORD=my-password
BUNNY_CDN_BASE=https://my-zone.b-cdn.net
BUNNY_STORAGE_REGION=de              # optional, defaults to Falkenstein (de)
```

## Quickstart

Every setup needs two things: a **server handler** (proxies uploads to Bunny Storage) and a **client** (handles the UI).

### Server

The handler works with any framework that supports standard `Request`/`Response`:

```ts
import { createBunnyUploadHandler } from "@bunny.net/upload";

const handler = createBunnyUploadHandler();

// handler is (request: Request) => Promise<Response>
```

### Client

Use `createUploader` for a framework-agnostic upload engine, or `createDropzone` to attach drag-and-drop to any element:

```ts
import { createUploader } from "@bunny.net/upload";

const uploader = createUploader();

uploader.on("complete", (results) => console.log(results));
uploader.addFiles(fileInput.files);
await uploader.upload();
```

```ts
import { createDropzone } from "@bunny.net/upload";

const dropzone = createDropzone(document.getElementById("dropzone"), {
  onComplete: (files) => console.log("Uploaded:", files),
});
```

## Server options

| Option | Type | Default | Description |
|---|---|---|---|
| `storageZone` | `string` | `BUNNY_STORAGE_ZONE` env var | Bunny Storage zone name |
| `storagePassword` | `string` | `BUNNY_STORAGE_PASSWORD` env var | Storage zone password |
| `cdnBase` | `string` | `BUNNY_CDN_BASE` env var | CDN base URL for generating file URLs |
| `storageRegion` | `StorageRegion` | `Falkenstein` | Storage region |
| `restrictions` | `HandlerRestrictions` | — | Server-side file validation |
| `getPath` | `(file, req) => string` | `/${file.name}` | Control where files are stored |
| `onBeforeUpload` | `(file, req) => void` | — | Validate before upload (throw to reject) |
| `onAfterUpload` | `(result, req) => void` | — | Run after successful upload |

### `getPath`

Controls where the file lands in your storage zone. The path becomes the key, and the CDN URL is `${cdnBase}${path}`.

```ts
// Flat with timestamp
getPath: (file) => `/uploads/${Date.now()}-${file.name}`

// Per-user folders
getPath: async (file, req) => {
  const session = await getSession(req);
  return `/users/${session.userId}/${file.name}`;
}

// By content type
getPath: (file) => `/${file.type.split("/")[0]}/${Date.now()}-${file.name}`
```

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

## Client options

### `createUploader(options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | `"/.bunny/upload"` | Server endpoint to upload to |
| `restrictions.maxFileSize` | `string \| number` | — | Max file size (e.g. `"10mb"`, `1048576`) |
| `restrictions.allowedTypes` | `string[]` | — | Allowed MIME types (supports globs like `"image/*"`) |
| `restrictions.maxFiles` | `number` | — | Max number of files |

### `Uploader`

| Method | Description |
|---|---|
| `addFiles(files)` | Add files from a `FileList` or `File[]`. Returns added `FileState[]`. |
| `removeFile(id)` | Remove a file by ID |
| `upload()` | Upload all pending files. Returns `Promise<UploadResult[]>`. |
| `reset()` | Clear all files |
| `getFiles()` | Get current file states |
| `on(event, fn)` | Subscribe to an event. Returns an unsubscribe function. |

### Events

| Event | Payload | Description |
|---|---|---|
| `state-change` | `FileState[]` | Any file state changed |
| `complete` | `UploadResult[]` | All uploads finished |
| `error` | `Error, FileState?` | An upload failed |
| `file-added` | `FileState` | A file was added |
| `file-removed` | `FileState` | A file was removed |
| `upload-progress` | `FileState` | Upload progress updated |

### Utilities

```ts
import { parseFileSize, matchesMimeType, formatBytes } from "@bunny.net/upload";

parseFileSize("10mb"); // 10485760
matchesMimeType("image/png", "image/*"); // true
formatBytes(10485760); // "10 MB"
```

## Storage regions

```ts
import { regions } from "@bunny.net/upload";

createBunnyUploadHandler({
  storageRegion: regions.StorageRegion.NewYork,
});
```

Available regions: `Falkenstein`, `NewYork`, `LosAngeles`, `Singapore`, `Sydney`, `London`, `Stockholm`, `SaoPaulo`, `Johannesburg`, `HongKong`, `Tokyo`, `Chicago`, `Madrid`.

## Presigned uploads

If your storage zone has S3 compatibility enabled, files upload directly from the browser to Bunny Storage — bypassing your server for the file transfer. Your server only handles signing and validation.

```ts
// Server — no changes needed, the handler auto-detects presign requests
createBunnyUploadHandler({
  restrictions: { maxFileSize: "10mb", allowedTypes: ["image/*"] },
  getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
});
```

```ts
// Client — add presigned: true
const uploader = createUploader({
  presigned: true,
  restrictions: { maxFileSize: "10mb", allowedTypes: ["image/*"] },
});
```

> **Note:** Presigned uploads require an S3-compatible storage zone (Frankfurt `de`, New York `ny`, or Singapore `sg`). S3 compatibility must be enabled during zone creation.

## Framework packages

Pair `@bunny.net/upload` with a framework package for your UI:

| Framework | Package | Install |
|---|---|---|
| React / Next.js | [`@bunny.net/upload-react`](../react) | `npm install @bunny.net/upload @bunny.net/upload-react @bunny.net/upload-next` |
| Vue / Nuxt | [`@bunny.net/upload-vue`](../vue) | `npm install @bunny.net/upload @bunny.net/upload-vue @bunny.net/upload-nuxt` |
| SolidJS / SolidStart | [`@bunny.net/upload-solid`](../solid) | `npm install @bunny.net/upload @bunny.net/upload-solid` |
| Angular | [`@bunny.net/upload-angular`](../angular) | `npm install @bunny.net/upload @bunny.net/upload-angular` |
| Vanilla JS | — | `npm install @bunny.net/upload` (use `createDropzone` directly) |
