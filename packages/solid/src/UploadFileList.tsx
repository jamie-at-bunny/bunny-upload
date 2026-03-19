import { For, Show } from "solid-js";
import type { FileState } from "@bunny.net/upload-core";
import { formatBytes } from "@bunny.net/upload-core";

export interface UploadFileListProps {
  files: FileState[];
  onRemove?: (id: string) => void;
  onRetry?: () => void;
  class?: string;
}

export function UploadFileList(props: UploadFileListProps) {
  return (
    <Show when={props.files.length > 0}>
      <ul class={`bunny-upload-file-list ${props.class ?? ""}`.trim()}>
        <For each={props.files}>
          {(file) => (
            <li class={`bunny-upload-file bunny-upload-file--${file.status}`}>
              <div class="bunny-upload-file-info">
                <span class="bunny-upload-file-name">{file.name}</span>
                <span class="bunny-upload-file-size">
                  {formatBytes(file.size)}
                </span>
              </div>

              <Show when={file.status === "uploading"}>
                <div class="bunny-upload-progress">
                  <div
                    class="bunny-upload-progress-bar"
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              </Show>

              <Show when={file.status === "error"}>
                <div class="bunny-upload-file-error">
                  <span>{file.error}</span>
                  <Show when={props.onRetry}>
                    <button class="bunny-upload-retry" onClick={props.onRetry}>
                      Retry
                    </button>
                  </Show>
                </div>
              </Show>

              <Show when={file.status === "complete"}>
                <span class="bunny-upload-file-complete">Uploaded</span>
              </Show>

              <Show
                when={
                  props.onRemove &&
                  (file.status === "idle" || file.status === "error")
                }
              >
                <button
                  class="bunny-upload-remove"
                  onClick={() => props.onRemove?.(file.id)}
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
  );
}
