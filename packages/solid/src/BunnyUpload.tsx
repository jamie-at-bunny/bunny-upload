import { Show } from "solid-js";
import { formatBytes, type FileState, type UploadResult } from "@bunny.net/upload-core";
import { createBunnyUpload } from "./create-bunny-upload";

export interface BunnyUploadProps {
  endpoint?: string;
  accept?: string[];
  maxSize?: string | number;
  maxFiles?: number;
  onComplete?: (files: UploadResult[]) => void;
  onError?: (error: Error, file?: FileState) => void;
  class?: string;
  autoUpload?: boolean;
  label?: string;
}

export function BunnyUpload(props: BunnyUploadProps) {
  const { files, addFiles, upload, isUploading } = createBunnyUpload({
    get endpoint() { return props.endpoint; },
    get accept() { return props.accept; },
    get maxSize() { return props.maxSize; },
    get maxFiles() { return props.maxFiles; },
    onComplete: (f) => props.onComplete?.(f),
    onError: (e, f) => props.onError?.(e, f),
  });

  let inputRef!: HTMLInputElement;

  const handleInputChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      addFiles(input.files);
      if (props.autoUpload !== false) {
        queueMicrotask(() => upload());
      }
      input.value = "";
    }
  };

  const latestFile = () => {
    const f = files();
    return f.length > 0 ? f[f.length - 1] : null;
  };

  return (
    <div class={`bunny-upload ${props.class ?? ""}`.trim()}>
      <button
        type="button"
        class="bunny-upload-button"
        onClick={() => inputRef.click()}
        disabled={isUploading()}
      >
        {props.label ?? "Choose file"}
      </button>
      <input
        ref={inputRef!}
        type="file"
        multiple={props.maxFiles !== 1}
        accept={props.accept?.join(",")}
        onChange={handleInputChange}
        style={{ display: "none" }}
      />
      <Show when={latestFile()}>
        {(file) => (
          <span class="bunny-upload-status">
            <span class="bunny-upload-filename">{file().name}</span>
            <Show when={file().status === "uploading"}>
              <span class="bunny-upload-progress">
                {Math.round(file().progress)}%
              </span>
            </Show>
            <Show when={file().status === "complete"}>
              <span class="bunny-upload-complete">Uploaded</span>
            </Show>
            <Show when={file().status === "error"}>
              <span class="bunny-upload-error">
                {file().error ?? "Failed"}
              </span>
            </Show>
            <Show when={file().status === "idle"}>
              <span class="bunny-upload-size">
                {formatBytes(file().size)}
              </span>
            </Show>
          </span>
        )}
      </Show>
      <Show when={files().length > 1}>
        <span class="bunny-upload-count">+{files().length - 1} more</span>
      </Show>
    </div>
  );
}
