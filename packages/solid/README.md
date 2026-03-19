# @bunny.net/upload-solid

SolidJS primitives and components for [bunny-upload](../../README.md).

## Install

```bash
npm install @bunny.net/upload-solid @bunny.net/upload
```

## Drop-in button

```tsx
import { BunnyUpload } from "@bunny.net/upload-solid";

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
| `class` | `string` | — | CSS class for the container |

## Upload widget

A button that opens a modal with dropzone, file list, and progress:

```tsx
import { UploadWidget } from "@bunny.net/upload-solid";

<UploadWidget
  accept={["image/*"]}
  maxSize="10mb"
  maxFiles={5}
  onComplete={(files) => console.log(files)}
/>
```

Custom trigger:

```tsx
<UploadWidget
  accept={["image/*"]}
  trigger={({ open }) => <button onClick={open}>My custom button</button>}
/>
```

## Custom dropzone

Full control over the UI with render props. All returned values are signals:

```tsx
import { UploadDropzone } from "@bunny.net/upload-solid";

<UploadDropzone accept={["image/*"]} maxSize="10mb">
  {({ isDragOver, openFilePicker, files, getDropzoneProps, getInputProps }) => {
    const dzProps = getDropzoneProps();
    const inProps = getInputProps();

    return (
      <div
        onDrop={dzProps.onDrop}
        onDragOver={dzProps.onDragOver}
        onDragLeave={dzProps.onDragLeave}
        onClick={openFilePicker}
      >
        <input ref={inProps.ref} type={inProps.type} multiple={inProps.multiple} accept={inProps.accept} onChange={inProps.onChange} style={inProps.style} />
        <p>{isDragOver() ? "Drop!" : "Drag files here"}</p>
        {files().map((f) => <div>{f.name} — {f.progress}%</div>)}
      </div>
    );
  }}
</UploadDropzone>
```

## Headless primitive

Maximum flexibility — just the state and methods, zero UI:

```tsx
import { createBunnyUpload } from "@bunny.net/upload-solid";

const { files, addFiles, removeFile, upload, reset, isUploading } = createBunnyUpload({
  accept: ["image/*"],
  maxSize: "10mb",
  maxFiles: 5,
  onComplete: (results) => console.log(results),
});

// files() and isUploading() are signals
files().map((f) => f.name);
```

### Return values

| Value | Type | Description |
|---|---|---|
| `files` | `() => FileState[]` | Signal — current file states |
| `addFiles` | `(files: FileList \| File[]) => void` | Add files to the queue |
| `removeFile` | `(id: string) => void` | Remove a file by ID |
| `upload` | `() => Promise<UploadResult[]>` | Start uploading |
| `reset` | `() => void` | Clear all files |
| `isUploading` | `() => boolean` | Signal — whether any file is uploading |

## Composable file list

```tsx
import { UploadFileList } from "@bunny.net/upload-solid";

<UploadFileList
  files={files()}
  onRemove={removeFile}
  onRetry={() => upload()}
/>
```

## Shared defaults

```tsx
import { configureBunnyUpload } from "@bunny.net/upload-solid";

const { BunnyUpload, createBunnyUpload } = configureBunnyUpload({
  accept: ["image/*"],
  maxSize: "10mb",
  maxFiles: 5,
});

export { BunnyUpload, createBunnyUpload };
```

## Server setup (SolidStart)

```ts
// src/routes/.bunny/upload.ts
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

## SSR

The `createBunnyUpload` primitive is SSR-safe — it returns inert stubs on the server and only instantiates the uploader in the browser. No `clientOnly` wrapper needed.
