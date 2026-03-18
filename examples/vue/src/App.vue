<script setup lang="ts">
import { ref } from "vue";
import { BunnyUpload, useBunnyUpload, type UploadResult } from "@bunny-upload/vue";

const uploadedFiles = ref<UploadResult[]>([]);

function onComplete(files: UploadResult[]) {
  uploadedFiles.value = [...uploadedFiles.value, ...files];
  console.log("Uploaded:", files.map((f) => f.url));
}

// Headless composable example
const { files: hookFiles, addFiles, upload, reset, isUploading } = useBunnyUpload({
  endpoint: "/.bunny/upload",
  accept: ["image/*"],
  maxSize: "10mb",
});

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files) addFiles(input.files);
}
</script>

<template>
  <main>
    <h1>Bunny Upload — Vue Example</h1>
    <p>Drop files below to upload them to Bunny Storage.</p>

    <BunnyUpload
      endpoint="/.bunny/upload"
      :accept="['image/*']"
      max-size="10mb"
      :max-files="5"
      @complete="onComplete"
    />

    <div v-if="uploadedFiles.length > 0">
      <h2>Uploaded Files</h2>
      <ul>
        <li v-for="file in uploadedFiles" :key="file.url">
          {{ file.name }} — {{ file.url }}
        </li>
      </ul>
    </div>

    <hr style="margin: 40px 0" />

    <h2>Headless Composable Example</h2>
    <div>
      <input type="file" multiple accept="image/*" @change="onFileInput" />
      <button @click="upload()" :disabled="isUploading">
        {{ isUploading ? "Uploading..." : "Upload" }}
      </button>
      <button @click="reset()">Reset</button>
      <ul>
        <li v-for="f in hookFiles" :key="f.id">
          {{ f.name }} — {{ f.status }}
          <span v-if="f.progress > 0">({{ f.progress }}%)</span>
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
