import { Uploader } from "./uploader";
import type { FileState, UploaderOptions, UploadResult, EventMap } from "./types";

export interface DropzoneOptions extends UploaderOptions {
  /** Upload files immediately when dropped/selected. Defaults to true. */
  autoUpload?: boolean;
  /** Called when the drag-over state changes */
  onDragOver?: (isDragOver: boolean) => void;
  /** Called when all uploads complete */
  onComplete?: (results: UploadResult[]) => void;
  /** Called when an upload fails */
  onError?: (error: Error, file?: FileState) => void;
  /** Called when any file state changes */
  onStateChange?: (files: FileState[]) => void;
}

export interface Dropzone {
  /** The underlying Uploader instance */
  uploader: Uploader;
  /** Open the native file picker */
  openFilePicker: () => void;
  /** Remove all event listeners and clean up */
  destroy: () => void;
}

/**
 * Attach drag-and-drop upload behaviour to any DOM element.
 *
 * ```ts
 * const dropzone = createDropzone(document.getElementById("drop-area"), {
 *   accept: ["image/*"],
 *   maxSize: "10mb",
 *   onComplete: (files) => console.log(files),
 * });
 *
 * // Clean up when done
 * dropzone.destroy();
 * ```
 */
export function createDropzone(
  element: HTMLElement,
  options: DropzoneOptions = {}
): Dropzone {
  const {
    autoUpload = true,
    onDragOver,
    onComplete,
    onError,
    onStateChange,
    ...uploaderOptions
  } = options;

  const uploader = new Uploader(uploaderOptions);

  // Hidden file input
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.style.display = "none";

  if (uploaderOptions.restrictions?.allowedTypes) {
    input.accept = uploaderOptions.restrictions.allowedTypes.join(",");
  }
  if (uploaderOptions.restrictions?.maxFiles === 1) {
    input.multiple = false;
  }

  element.appendChild(input);

  // Wire up events
  const unsubs: (() => void)[] = [];

  if (onStateChange) {
    unsubs.push(uploader.on("state-change", onStateChange));
  }
  if (onComplete) {
    unsubs.push(uploader.on("complete", onComplete));
  }
  if (onError) {
    unsubs.push(uploader.on("error", onError));
  }

  function handleFiles(fileList: FileList | File[]) {
    uploader.addFiles(fileList);
    if (autoUpload) {
      uploader.upload();
    }
  }

  // Drag-and-drop handlers
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    onDragOver?.(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    onDragOver?.(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    onDragOver?.(false);
    if (e.dataTransfer?.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  }

  // File input handler
  function handleInputChange() {
    if (input.files?.length) {
      handleFiles(input.files);
      input.value = "";
    }
  }

  element.addEventListener("dragover", handleDragOver);
  element.addEventListener("dragleave", handleDragLeave);
  element.addEventListener("drop", handleDrop);
  input.addEventListener("change", handleInputChange);

  function openFilePicker() {
    input.click();
  }

  function destroy() {
    element.removeEventListener("dragover", handleDragOver);
    element.removeEventListener("dragleave", handleDragLeave);
    element.removeEventListener("drop", handleDrop);
    input.removeEventListener("change", handleInputChange);
    input.remove();
    unsubs.forEach((fn) => fn());
  }

  return { uploader, openFilePicker, destroy };
}
