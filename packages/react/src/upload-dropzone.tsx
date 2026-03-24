import React, { useCallback, useRef, useState } from "react";
import type { FileState, UploadResult } from "@bunny.net/upload-core";
import { useBunnyUpload } from "./use-bunny-upload";

export interface UploadDropzoneRenderProps {
  /** Whether a file is being dragged over the dropzone */
  isDragOver: boolean;
  /** Open the native file picker */
  openFilePicker: () => void;
  /** Current file states */
  files: FileState[];
  /** Remove a file by ID */
  removeFile: (id: string) => void;
  /** Manually trigger upload (when autoUpload is false) */
  upload: () => Promise<UploadResult[]>;
  /** Reset all files */
  reset: () => void;
  /** Whether any file is currently uploading */
  isUploading: boolean;
  /** Props to spread onto your dropzone container element */
  getDropzoneProps: () => {
    onDrop: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
  };
  /** Props to spread onto a hidden file input */
  getInputProps: () => {
    ref: React.RefObject<HTMLInputElement | null>;
    type: "file";
    multiple: boolean;
    accept: string | undefined;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    style: { display: "none" };
  };
}

export interface UploadDropzoneProps {
  endpoint?: string;
  accept?: string[];
  maxSize?: string | number;
  maxFiles?: number;
  presigned?: boolean;
  autoUpload?: boolean;
  onComplete?: (files: UploadResult[]) => void;
  onError?: (error: Error, file?: FileState) => void;
  children: (props: UploadDropzoneRenderProps) => React.ReactNode;
}

export function UploadDropzone({
  endpoint,
  accept,
  maxSize,
  maxFiles,
  presigned,
  autoUpload = true,
  onComplete,
  onError,
  children,
}: UploadDropzoneProps) {
  const { files, addFiles, removeFile, upload, reset, isUploading } =
    useBunnyUpload({
      endpoint,
      accept,
      maxSize,
      maxFiles,
      presigned,
      onComplete,
      onError,
    });

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      addFiles(fileList);
      if (autoUpload) {
        queueMicrotask(() => upload());
      }
    },
    [addFiles, autoUpload, upload]
  );

  const getDropzoneProps = useCallback(
    () => ({
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files.length > 0) {
          handleFiles(e.dataTransfer.files);
        }
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
      },
      onDragLeave: (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
      },
    }),
    [handleFiles]
  );

  const getInputProps = useCallback(
    () => ({
      ref: inputRef,
      type: "file" as const,
      multiple: maxFiles !== 1,
      accept: accept?.join(","),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
          handleFiles(e.target.files);
          e.target.value = "";
        }
      },
      style: { display: "none" as const },
    }),
    [accept, maxFiles, handleFiles]
  );

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <>
      {children({
        isDragOver,
        openFilePicker,
        files,
        removeFile,
        upload,
        reset,
        isUploading,
        getDropzoneProps,
        getInputProps,
      })}
    </>
  );
}
