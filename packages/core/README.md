# @bunny.net/upload-core

Framework-agnostic upload engine for [bunny-upload](../../README.md).

You probably don't need to use this package directly — use [`@bunny.net/upload-react`](../react), [`@bunny.net/upload-vue`](../vue), or [`@bunny.net/upload-angular`](../angular) instead. This package is the shared foundation they all build on.

## Install

```bash
npm install @bunny.net/upload-core
```

## Usage

```ts
import { createUploader } from "@bunny.net/upload-core";

const uploader = createUploader({
  endpoint: "/.bunny/upload", // default
  restrictions: {
    maxFileSize: "10mb",
    allowedTypes: ["image/*"],
    maxFiles: 5,
  },
});

// Listen for events
uploader.on("state-change", (files) => console.log(files));
uploader.on("complete", (results) => console.log(results));
uploader.on("error", (error, file) => console.error(error));

// Add files (from an <input> or drag-and-drop)
uploader.addFiles(fileInput.files);

// Upload
const results = await uploader.upload();
// [{ name: "photo.jpg", path: "/uploads/photo.jpg", size: 102400, url: "https://cdn.example.com/uploads/photo.jpg" }]
```

## API

### `createUploader(options?)`

Creates a new `Uploader` instance.

#### Options

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
| `off(event, fn)` | Unsubscribe from an event |

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
import { parseFileSize, matchesMimeType, formatBytes } from "@bunny.net/upload-core";

parseFileSize("10mb"); // 10485760
matchesMimeType("image/png", "image/*"); // true
formatBytes(10485760); // "10 MB"
```
