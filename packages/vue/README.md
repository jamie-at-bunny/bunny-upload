# @bunny.net/upload-vue

Vue composable and drop-in component for [bunny-upload](../../README.md).

## Install

```bash
npm install @bunny.net/upload-vue @bunny.net/upload-handler
```

## Drop-in component

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

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | `"/.bunny/upload"` | Server upload endpoint |
| `accept` | `string[]` | — | Allowed MIME types (e.g. `["image/*"]`) |
| `maxSize` | `string \| number` | — | Max file size (e.g. `"10mb"`) |
| `maxFiles` | `number` | — | Max number of files |
| `autoUpload` | `boolean` | `true` | Upload immediately when files are added |

### Events

| Event | Payload | Description |
|---|---|---|
| `complete` | `UploadResult[]` | All uploads finished |
| `error` | `Error` | An upload failed |

## Headless composable

For full control over the UI:

```vue
<script setup lang="ts">
import { useBunnyUpload } from "@bunny.net/upload-vue";

const { files, addFiles, removeFile, upload, reset, isUploading } = useBunnyUpload({
  accept: ["image/*"],
  maxSize: "10mb",
  maxFiles: 5,
  onComplete: (results) => console.log(results),
});

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files) addFiles(input.files);
}
</script>

<template>
  <div>
    <input type="file" multiple @change="onFileChange" />
    <div v-for="file in files.value" :key="file.id">
      {{ file.name }} — {{ file.status }} ({{ file.progress }}%)
      <button @click="removeFile(file.id)">Remove</button>
    </div>
    <button @click="upload" :disabled="isUploading.value">Upload</button>
  </div>
</template>
```

## Shared defaults

Use `configureBunnyUpload` to set defaults across your app:

```ts
import { configureBunnyUpload } from "@bunny.net/upload-vue";

const { BunnyUpload, useBunnyUpload } = configureBunnyUpload({
  accept: ["image/*"],
  maxSize: "10mb",
  maxFiles: 5,
});

export { BunnyUpload, useBunnyUpload };
```

## Server setup

You'll need a server route to handle uploads. See the [handler docs](../handler) for full options.

For Nuxt, see [`@bunny.net/upload-nuxt`](../nuxt). For other backends, the handler works with any framework that supports standard `Request`/`Response`.
