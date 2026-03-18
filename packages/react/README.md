# @bunny.net/upload-react

React hooks and drop-in component for [bunny-upload](../../README.md).

## Install

```bash
npm install @bunny.net/upload-react @bunny.net/upload-handler @bunny.net/upload-next
```

## Drop-in component

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

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | `"/.bunny/upload"` | Server upload endpoint |
| `accept` | `string[]` | — | Allowed MIME types (e.g. `["image/*"]`) |
| `maxSize` | `string \| number` | — | Max file size (e.g. `"10mb"`) |
| `maxFiles` | `number` | — | Max number of files |
| `autoUpload` | `boolean` | `true` | Upload immediately when files are added |
| `onComplete` | `(files: UploadResult[]) => void` | — | Called when all uploads finish |
| `onError` | `(error: Error, file?: FileState) => void` | — | Called when an upload fails |
| `className` | `string` | — | CSS class for the container |

## Headless hook

For full control over the UI:

```tsx
"use client";

import { useBunnyUpload } from "@bunny.net/upload-react";

export default function CustomUploader() {
  const { files, addFiles, removeFile, upload, reset, isUploading } = useBunnyUpload({
    accept: ["image/*"],
    maxSize: "10mb",
    maxFiles: 5,
    onComplete: (results) => console.log(results),
  });

  return (
    <div>
      <input type="file" multiple onChange={(e) => addFiles(e.target.files!)} />
      {files.map((file) => (
        <div key={file.id}>
          {file.name} — {file.status} ({file.progress}%)
          <button onClick={() => removeFile(file.id)}>Remove</button>
        </div>
      ))}
      <button onClick={upload} disabled={isUploading}>Upload</button>
    </div>
  );
}
```

## Shared defaults

Use `configureBunnyUpload` to set defaults across your app without React context:

```tsx
import { configureBunnyUpload } from "@bunny.net/upload-react";

const { BunnyUpload, useBunnyUpload } = configureBunnyUpload({
  accept: ["image/*"],
  maxSize: "10mb",
  maxFiles: 5,
});

// Use these pre-configured versions anywhere
export { BunnyUpload, useBunnyUpload };
```

## Server setup

You'll need a server route to handle uploads. See the [handler docs](../handler) for full options.

```ts
// app/.bunny/upload/route.ts
import { serveBunnyUpload } from "@bunny.net/upload-next";
import { createBunnyUploadHandler } from "@bunny.net/upload-handler";

export const { POST } = serveBunnyUpload(
  createBunnyUploadHandler({
    restrictions: { maxFileSize: "10mb", allowedTypes: ["image/*"], maxFiles: 5 },
    getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
  })
);
```
