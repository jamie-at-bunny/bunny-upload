import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
  createUploader,
  type FileState,
  type Restrictions,
  type UploadResult,
} from "@bunny.net/upload-core";

export interface UseBunnyUploadOptions {
  endpoint?: string;
  accept?: string[];
  maxSize?: string | number;
  maxFiles?: number;
  presigned?: boolean;
  onComplete?: (files: UploadResult[]) => void;
  onError?: (error: Error, file?: FileState) => void;
}

export interface UseBunnyUploadReturn {
  files: FileState[];
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  upload: () => Promise<UploadResult[]>;
  reset: () => void;
  isUploading: boolean;
}

export function useBunnyUpload(
  options: UseBunnyUploadOptions
): UseBunnyUploadReturn {
  const { endpoint, accept, maxSize, maxFiles, presigned, onComplete, onError } = options;

  const restrictions: Restrictions = {
    allowedTypes: accept,
    maxFileSize: maxSize,
    maxFiles,
  };

  const uploaderRef = useRef(createUploader({ endpoint, restrictions, presigned }));
  const filesRef = useRef<FileState[]>([]);
  const subscribersRef = useRef(new Set<() => void>());

  const subscribe = useCallback((callback: () => void) => {
    subscribersRef.current.add(callback);
    return () => subscribersRef.current.delete(callback);
  }, []);

  const getSnapshot = useCallback(() => filesRef.current, []);

  useEffect(() => {
    const uploader = uploaderRef.current;

    const unsubState = uploader.on("state-change", (files) => {
      filesRef.current = files;
      subscribersRef.current.forEach((cb) => cb());
    });

    const unsubComplete = uploader.on("complete", (results) => {
      onComplete?.(results);
    });

    const unsubError = uploader.on("error", (error, file) => {
      onError?.(error, file);
    });

    return () => {
      unsubState();
      unsubComplete();
      unsubError();
    };
  }, [onComplete, onError]);

  const files = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const addFiles = useCallback((input: FileList | File[]) => {
    uploaderRef.current.addFiles(input);
  }, []);

  const removeFile = useCallback((id: string) => {
    uploaderRef.current.removeFile(id);
  }, []);

  const upload = useCallback(async () => {
    return uploaderRef.current.upload();
  }, []);

  const reset = useCallback(() => {
    uploaderRef.current.reset();
  }, []);

  const isUploading = files.some((f) => f.status === "uploading");

  return { files, addFiles, removeFile, upload, reset, isUploading };
}
