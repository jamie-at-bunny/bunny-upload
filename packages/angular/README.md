# @bunny.net/upload-angular

Angular service and standalone component for [bunny-upload](../../README.md).

## Install

```bash
npm install @bunny.net/upload-angular
```

## Drop-in component

```ts
import { Component } from "@angular/core";
import { BunnyUploadComponent, type UploadResult } from "@bunny.net/upload-angular";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [BunnyUploadComponent],
  template: `
    <bunny-upload
      [accept]="['image/*']"
      maxSize="10mb"
      [maxFiles]="5"
      (completed)="onComplete($event)"
    />
  `,
})
export class AppComponent {
  onComplete(results: UploadResult[]) {
    console.log("Uploaded:", results);
  }
}
```

### Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | `"/.bunny/upload"` | Server upload endpoint |
| `accept` | `string[]` | — | Allowed MIME types (e.g. `["image/*"]`) |
| `maxSize` | `string \| number` | — | Max file size (e.g. `"10mb"`) |
| `maxFiles` | `number` | — | Max number of files |
| `autoUpload` | `boolean` | `true` | Upload immediately when files are added |

### Outputs

| Output | Payload | Description |
|---|---|---|
| `completed` | `UploadResult[]` | All uploads finished |

## Headless service

For full control over the UI, inject `BunnyUploadService`:

```ts
import { Component, inject } from "@angular/core";
import { BunnyUploadService, type UploadResult } from "@bunny.net/upload-angular";

@Component({
  selector: "app-uploader",
  standalone: true,
  providers: [BunnyUploadService],
  template: `
    <input type="file" multiple (change)="onFileChange($event)" />
    @for (file of uploadService.files(); track file.id) {
      <div>{{ file.name }} — {{ file.status }} ({{ file.progress }}%)</div>
    }
    <button (click)="upload()" [disabled]="uploadService.isUploading()">Upload</button>
  `,
})
export class UploaderComponent {
  uploadService = inject(BunnyUploadService);

  constructor() {
    this.uploadService.configure({
      restrictions: { maxFileSize: "10mb", allowedTypes: ["image/*"], maxFiles: 5 },
    });
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) this.uploadService.addFiles(input.files);
  }

  async upload() {
    const results = await this.uploadService.upload();
    console.log("Uploaded:", results);
  }
}
```

### Service API

| Property / Method | Description |
|---|---|
| `files()` | Signal of current `FileState[]` |
| `isUploading()` | Computed signal, `true` when any file is uploading |
| `configure(options)` | Set uploader options |
| `addFiles(files)` | Add files from `FileList` or `File[]` |
| `removeFile(id)` | Remove a file by ID |
| `upload()` | Upload all pending files, returns `Promise<UploadResult[]>` |
| `reset()` | Clear all files |

## Server setup

You'll need a server route to handle uploads. The Angular example uses a separate backend — see the [handler docs](../handler) for full options. The handler works with any framework that supports standard `Request`/`Response` (Hono, Express, Fastify, etc.).
