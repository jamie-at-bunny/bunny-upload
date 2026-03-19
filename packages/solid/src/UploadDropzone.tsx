import { createSignal } from "solid-js";
import type { JSX } from "solid-js";
import type { FileState, UploadResult } from "@bunny.net/upload-core";
import { createBunnyUpload } from "./create-bunny-upload";

export interface UploadDropzoneRenderProps {
  isDragOver: () => boolean;
  openFilePicker: () => void;
  files: () => FileState[];
  removeFile: (id: string) => void;
  upload: () => Promise<UploadResult[]>;
  reset: () => void;
  isUploading: () => boolean;
  getDropzoneProps: () => {
    onDrop: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDragLeave: (e: DragEvent) => void;
  };
  getInputProps: () => {
    ref: (el: HTMLInputElement) => void;
    type: "file";
    multiple: boolean;
    accept: string | undefined;
    onChange: (e: Event) => void;
    style: { display: "none" };
  };
}

export interface UploadDropzoneProps {
  endpoint?: string;
  accept?: string[];
  maxSize?: string | number;
  maxFiles?: number;
  autoUpload?: boolean;
  onComplete?: (files: UploadResult[]) => void;
  onError?: (error: Error, file?: FileState) => void;
  children: (props: UploadDropzoneRenderProps) => JSX.Element;
}

export function UploadDropzone(props: UploadDropzoneProps) {
  const { files, addFiles, removeFile, upload, reset, isUploading } =
    createBunnyUpload({
      get endpoint() { return props.endpoint; },
      get accept() { return props.accept; },
      get maxSize() { return props.maxSize; },
      get maxFiles() { return props.maxFiles; },
      onComplete: (f) => props.onComplete?.(f),
      onError: (e, f) => props.onError?.(e, f),
    });

  let inputRef!: HTMLInputElement;
  const [isDragOver, setIsDragOver] = createSignal(false);

  const handleFiles = (fileList: FileList | File[]) => {
    addFiles(fileList);
    if (props.autoUpload !== false) {
      queueMicrotask(() => upload());
    }
  };

  const getDropzoneProps = () => ({
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer?.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    },
    onDragLeave: (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
    },
  });

  const getInputProps = () => ({
    ref: (el: HTMLInputElement) => {
      inputRef = el;
    },
    type: "file" as const,
    multiple: props.maxFiles !== 1,
    accept: props.accept?.join(","),
    onChange: (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (input.files?.length) {
        handleFiles(input.files);
        input.value = "";
      }
    },
    style: { display: "none" as const },
  });

  const openFilePicker = () => inputRef?.click();

  return (
    <>
      {props.children({
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
