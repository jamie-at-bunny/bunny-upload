<script setup lang="ts">
import { ref } from "vue";
import { BunnyUpload, UploadDropzone, formatBytes, type UploadResult } from "@bunny.net/upload-vue";

const uploadedFiles = ref<UploadResult[]>([]);

function onComplete(files: UploadResult[]) {
  uploadedFiles.value = [...uploadedFiles.value, ...files];
  console.log("Uploaded:", files.map((f) => f.url));
}
</script>

<template>
  <main>
    <h1>Bunny Upload — Nuxt Example</h1>

    <h2>Drop-in Component</h2>
    <p>Everything built in — drop zone, file list, progress bars.</p>
    <BunnyUpload
      :accept="['image/*']"
      max-size="10mb"
      :max-files="5"
      @complete="onComplete"
    />

    <hr style="margin: 40px 0" />

    <h2>Custom Dropzone</h2>
    <p>Full control over the UI with scoped slots.</p>
    <UploadDropzone
      :accept="['image/*']"
      max-size="10mb"
      :max-files="5"
      @complete="onComplete"
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
                <template v-if="file.status === 'uploading'">{{ file.progress }}%</template>
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

    <div v-if="uploadedFiles.length > 0" style="margin-top: 16px">
      <h2>Uploaded Files</h2>
      <ul>
        <li v-for="file in uploadedFiles" :key="file.url">
          <a :href="file.url" target="_blank">{{ file.name }}</a>
        </li>
      </ul>
    </div>
  </main>
</template>

<style scoped>
main {
  max-width: 600px;
  margin: 40px auto;
  padding: 0 20px;
}
</style>
