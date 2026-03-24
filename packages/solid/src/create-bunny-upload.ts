import { createSignal, onCleanup } from "solid-js";
import { isServer } from "solid-js/web";
import {
  createUploader,
  type FileState,
  type Restrictions,
  type UploadResult,
} from "@bunny.net/upload-core";

export interface CreateBunnyUploadOptions {
  endpoint?: string;
  accept?: string[];
  maxSize?: string | number;
  maxFiles?: number;
  presigned?: boolean;
  onComplete?: (files: UploadResult[]) => void;
  onError?: (error: Error, file?: FileState) => void;
}

export interface CreateBunnyUploadReturn {
  files: () => FileState[];
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  upload: () => Promise<UploadResult[]>;
  reset: () => void;
  isUploading: () => boolean;
}

const noop = () => {};

export function createBunnyUpload(
  options: CreateBunnyUploadOptions
): CreateBunnyUploadReturn {
  const [files, setFiles] = createSignal<FileState[]>([]);

  // On the server, return inert stubs — the real uploader only runs in the browser.
  if (isServer) {
    return {
      files,
      addFiles: noop,
      removeFile: noop,
      upload: () => Promise.resolve([]),
      reset: noop,
      isUploading: () => false,
    };
  }

  const { endpoint, accept, maxSize, maxFiles, presigned, onComplete, onError } = options;

  const restrictions: Restrictions = {
    allowedTypes: accept,
    maxFileSize: maxSize,
    maxFiles,
  };

  const uploader = createUploader({ endpoint, restrictions, presigned });

  const unsubState = uploader.on("state-change", (updatedFiles) => {
    setFiles([...updatedFiles]);
  });

  const unsubComplete = uploader.on("complete", (results) => {
    onComplete?.(results);
  });

  const unsubError = uploader.on("error", (error, file) => {
    onError?.(error, file);
  });

  onCleanup(() => {
    unsubState();
    unsubComplete();
    unsubError();
  });

  const addFiles = (input: FileList | File[]) => {
    uploader.addFiles(input);
  };

  const removeFile = (id: string) => {
    uploader.removeFile(id);
  };

  const upload = () => uploader.upload();

  const reset = () => {
    uploader.reset();
  };

  const isUploading = () => files().some((f) => f.status === "uploading");

  return { files, addFiles, removeFile, upload, reset, isUploading };
}
