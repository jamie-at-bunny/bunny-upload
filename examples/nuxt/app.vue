<script setup lang="ts">
import { ref } from "vue";
import {
  BunnyUpload,
  UploadWidget,
  UploadDropzone,
  UploadFileList,
  useBunnyUpload,
  formatBytes,
  type UploadResult,
  type FileState,
} from "@bunny.net/upload-vue";

// For the hook example
const {
  files: hookFiles,
  addFiles,
  removeFile: hookRemoveFile,
  upload: hookUpload,
  reset: hookReset,
  isUploading: hookIsUploading,
} = useBunnyUpload({
  accept: ["image/*"],
  maxSize: "10mb",
  maxFiles: 5,
  onComplete: (files) => console.log("Hook uploaded:", files),
});

const hookInputRef = ref<HTMLInputElement | null>(null);
</script>

<template>
  <main>
    <h1>Bunny Upload — Nuxt</h1>

    <section>
      <h2>Simple Button</h2>
      <p>Pick a file and see its name + upload status inline.</p>
      <BunnyUpload
        :accept="['image/*']"
        max-size="10mb"
        @complete="(files: UploadResult[]) => console.log('Uploaded:', files)"
      />
    </section>

    <section>
      <h2>Upload Widget</h2>
      <p>A button that opens a modal with dropzone, file list, and progress.</p>
      <UploadWidget
        :accept="['image/*']"
        max-size="10mb"
        :max-files="5"
        @complete="(files: UploadResult[]) => console.log('Uploaded:', files)"
      />
    </section>

    <section>
      <h2>Custom Dropzone</h2>
      <p>Full control over the UI with scoped slots.</p>
      <UploadDropzone
        :accept="['image/*']"
        max-size="10mb"
        :max-files="5"
        @complete="(files: UploadResult[]) => console.log('Uploaded:', files)"
      >
        <template #default="{ isDragOver, openFilePicker, files, removeFile, getDropzoneProps }">
          <div>
            <div
              v-bind="getDropzoneProps()"
              @click="openFilePicker"
              :style="{
                border: `2px dashed ${isDragOver ? '#f60' : '#ccc'}`,
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragOver ? '#fff8f0' : 'transparent',
                transition: 'all 0.2s',
              }"
            >
              <p>{{ isDragOver ? "Drop to upload" : "Drag images here or click to browse" }}</p>
            </div>

            <ul v-if="files.length > 0" style="list-style: none; padding: 0; margin-top: 16px">
              <li
                v-for="file in files"
                :key="file.id"
                style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee"
              >
                <span>
                  <strong>{{ file.name }}</strong>
                  <span style="color: #888; margin-left: 8px">{{ formatBytes(file.size) }}</span>
                </span>
                <span>
                  <template v-if="file.status === 'uploading'">{{ Math.round(file.progress) }}%</template>
                  <template v-if="file.status === 'complete'">✓</template>
                  <template v-if="file.status === 'error'">
                    <span style="color: red">{{ file.error }}</span>
                  </template>
                  <button
                    v-if="file.status === 'idle' || file.status === 'error'"
                    @click="removeFile(file.id)"
                    style="margin-left: 8px; cursor: pointer"
                  >×</button>
                </span>
              </li>
            </ul>
          </div>
        </template>
      </UploadDropzone>
    </section>

    <section>
      <h2>Headless Composable</h2>
      <p>Maximum control — just the state and methods, zero UI from us.</p>
      <div style="display: flex; gap: 8px">
        <label style="display: inline-block; padding: 8px 16px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer">
          Add files
          <input
            ref="hookInputRef"
            type="file"
            multiple
            accept="image/*"
            @change="(e: Event) => {
              const input = e.target as HTMLInputElement;
              if (input.files?.length) {
                addFiles(input.files);
                input.value = '';
              }
            }"
            style="display: none"
          />
        </label>
        <button @click="hookUpload()" :disabled="hookIsUploading || hookFiles.length === 0" style="padding: 8px 16px">
          {{ hookIsUploading ? 'Uploading...' : 'Upload' }}
        </button>
        <button @click="hookReset()" :disabled="hookFiles.length === 0" style="padding: 8px 16px">
          Reset
        </button>
      </div>

      <UploadFileList
        :files="hookFiles"
        @remove="hookRemoveFile"
        @retry="hookUpload()"
      />
    </section>
  </main>
</template>

<style scoped>
main {
  max-width: 640px;
  margin: 40px auto;
  padding: 0 20px;
}
section {
  margin-top: 40px;
}
section p {
  color: #666;
  margin-bottom: 16px;
}
</style>
