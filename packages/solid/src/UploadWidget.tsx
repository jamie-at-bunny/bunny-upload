import { createSignal, Show, For, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { formatBytes, type FileState, type UploadResult } from "@bunny.net/upload-core";
import { createBunnyUpload } from "./create-bunny-upload";

export interface UploadWidgetProps {
  endpoint?: string;
  accept?: string[];
  maxSize?: string | number;
  maxFiles?: number;
  onComplete?: (files: UploadResult[]) => void;
  onError?: (error: Error, file?: FileState) => void;
  autoUpload?: boolean;
  label?: string;
  trigger?: (props: { open: () => void }) => JSX.Element;
}

export function UploadWidget(props: UploadWidgetProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [isDragOver, setIsDragOver] = createSignal(false);

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
  let dialogRef!: HTMLDialogElement;

  const label = () => props.label ?? "Upload files";
  const autoUpload = () => props.autoUpload !== false;
  const allComplete = () =>
    files().length > 0 && files().every((f) => f.status === "complete");

  const open = () => {
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    reset();
    dialogRef?.close();
  };

  const handleFiles = (fileList: FileList | File[]) => {
    addFiles(fileList);
    if (autoUpload()) {
      queueMicrotask(() => upload());
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer?.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onInputChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) {
      handleFiles(input.files);
      input.value = "";
    }
  };

  return (
    <div style={{ display: "contents" }}>
      {props.trigger ? (
        props.trigger({ open })
      ) : (
        <button type="button" class="bunny-widget-trigger" onClick={open}>
          {label()}
        </button>
      )}

      <Show when={isOpen()}>
        <dialog
          ref={(el) => {
            dialogRef = el;
            // showModal on next microtask after DOM insertion
            queueMicrotask(() => el.showModal());
          }}
          class="bunny-widget-dialog"
          onClose={close}
          onClick={(e) => {
            if (e.target === dialogRef) close();
          }}
          aria-modal="true"
          aria-label={label()}
        >
          <div class="bunny-widget">
            <div class="bunny-widget-header">
              <span class="bunny-widget-title">{label()}</span>
              <button
                type="button"
                class="bunny-widget-close"
                onClick={close}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div
              class={`bunny-widget-dropzone ${isDragOver() ? "bunny-widget-dropzone--active" : ""}`}
              onDrop={onDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
              onClick={() => inputRef?.click()}
              role="button"
              tabIndex={0}
              aria-label="Drop files here or click to browse"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef?.click();
              }}
            >
              <input
                ref={inputRef!}
                type="file"
                multiple={props.maxFiles !== 1}
                accept={props.accept?.join(",")}
                onChange={onInputChange}
                style={{ display: "none" }}
              />
              <p class="bunny-widget-dropzone-text">
                {isDragOver()
                  ? "Drop to upload"
                  : "Drop files here or click to browse"}
              </p>
              <Show when={props.maxSize != null}>
                <p class="bunny-widget-hint">
                  Max{" "}
                  {typeof props.maxSize === "string"
                    ? props.maxSize
                    : formatBytes(props.maxSize as number)}
                  {props.maxFiles
                    ? ` · ${props.maxFiles} file${props.maxFiles > 1 ? "s" : ""}`
                    : ""}
                </p>
              </Show>
            </div>

            <Show when={files().length > 0}>
              <ul class="bunny-widget-file-list" aria-live="polite">
                <For each={files()}>
                  {(file) => (
                    <li class={`bunny-widget-file bunny-widget-file--${file.status}`}>
                      <span class="bunny-widget-file-name">{file.name}</span>
                      <span class="bunny-widget-file-size">
                        {formatBytes(file.size)}
                      </span>

                      <Show when={file.status === "uploading"}>
                        <div
                          class="bunny-widget-progress"
                          role="progressbar"
                          aria-valuenow={Math.round(file.progress)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Uploading ${file.name}`}
                        >
                          <div
                            class="bunny-widget-progress-bar"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      </Show>

                      <Show when={file.status === "complete"}>
                        <span class="bunny-widget-file-complete">✓</span>
                      </Show>

                      <Show when={file.status === "error"}>
                        <span class="bunny-widget-file-error">
                          {file.error ?? "Failed"}
                        </span>
                      </Show>

                      <Show
                        when={
                          file.status === "idle" || file.status === "error"
                        }
                      >
                        <button
                          class="bunny-widget-file-remove"
                          onClick={() => removeFile(file.id)}
                          aria-label={`Remove ${file.name}`}
                        >
                          &times;
                        </button>
                      </Show>
                    </li>
                  )}
                </For>
              </ul>
            </Show>

            <div class="bunny-widget-footer">
              <Show
                when={
                  !autoUpload() &&
                  files().some((f) => f.status === "idle")
                }
              >
                <button
                  type="button"
                  class="bunny-widget-upload"
                  onClick={() => upload()}
                  disabled={isUploading()}
                >
                  {isUploading() ? "Uploading..." : "Upload"}
                </button>
              </Show>
              <Show when={allComplete()}>
                <button
                  type="button"
                  class="bunny-widget-done"
                  onClick={close}
                >
                  Done
                </button>
              </Show>
            </div>
          </div>
        </dialog>
      </Show>
    </div>
  );
}
