import { shallowRef, computed, onUnmounted, type Ref, type ComputedRef } from "vue";
import {
  createUploader,
  type FileState,
  type Restrictions,
  type UploadResult,
} from "@bunny-upload/core";

export interface UseBunnyUploadOptions {
  endpoint?: string;
  accept?: string[];
  maxSize?: string | number;
  maxFiles?: number;
  onComplete?: (files: UploadResult[]) => void;
  onError?: (error: Error, file?: FileState) => void;
}

export interface UseBunnyUploadReturn {
  files: Readonly<Ref<FileState[]>>;
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  upload: () => Promise<UploadResult[]>;
  reset: () => void;
  isUploading: ComputedRef<boolean>;
}

export function useBunnyUpload(
  options: UseBunnyUploadOptions
): UseBunnyUploadReturn {
  const { endpoint, accept, maxSize, maxFiles, onComplete, onError } = options;

  const restrictions: Restrictions = {
    allowedTypes: accept,
    maxFileSize: maxSize,
    maxFiles,
  };

  const uploader = createUploader({ endpoint, restrictions });
  const files = shallowRef<FileState[]>([]);

  const unsubState = uploader.on("state-change", (newFiles) => {
    files.value = newFiles;
  });

  const unsubComplete = uploader.on("complete", (results) => {
    onComplete?.(results);
  });

  const unsubError = uploader.on("error", (error, file) => {
    onError?.(error, file);
  });

  onUnmounted(() => {
    unsubState();
    unsubComplete();
    unsubError();
  });

  const isUploading = computed(() =>
    files.value.some((f) => f.status === "uploading")
  );

  function addFiles(input: FileList | File[]) {
    uploader.addFiles(input);
  }

  function removeFile(id: string) {
    uploader.removeFile(id);
  }

  async function upload(): Promise<UploadResult[]> {
    return uploader.upload();
  }

  function reset() {
    uploader.reset();
  }

  return { files, addFiles, removeFile, upload, reset, isUploading };
}
