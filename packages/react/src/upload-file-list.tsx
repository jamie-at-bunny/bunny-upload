import type { FileState } from "@bunny.net/upload-core";
import { formatBytes } from "@bunny.net/upload-core";
import { defaultLocale } from "@bunny.net/upload-shared";
import type { BunnyUploadLocale } from "@bunny.net/upload-shared";

export interface UploadFileListProps {
  files: FileState[];
  onRemove?: (id: string) => void;
  onRetry?: () => void;
  className?: string;
  /** Override user-facing strings for i18n */
  locale?: BunnyUploadLocale;
}

export function UploadFileList({
  files,
  onRemove,
  onRetry,
  className,
  locale: l = defaultLocale,
}: UploadFileListProps) {
  if (files.length === 0) return null;

  return (
    <ul className={`bunny-upload-file-list ${className ?? ""}`.trim()} aria-live="polite">
      {files.map((file) => (
        <li
          key={file.id}
          className={`bunny-upload-file bunny-upload-file--${file.status}`}
        >
          <div className="bunny-upload-file-info">
            <span className="bunny-upload-file-name">{file.name}</span>
            <span className="bunny-upload-file-size">
              {formatBytes(file.size)}
            </span>
          </div>

          {file.status === "uploading" && (
            <div
              className="bunny-upload-progress"
              role="progressbar"
              aria-valuenow={Math.round(file.progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={l.ariaUploadingFile(file.name)}
            >
              <div
                className="bunny-upload-progress-bar"
                style={{ width: `${file.progress}%` }}
              />
            </div>
          )}

          {file.status === "error" && (
            <div className="bunny-upload-file-error" role="alert">
              <span>{file.error}</span>
              {onRetry && (
                <button className="bunny-upload-retry" onClick={onRetry}>
                  {l.retry}
                </button>
              )}
            </div>
          )}

          {file.status === "complete" && (
            <span className="bunny-upload-file-complete">{l.uploaded}</span>
          )}

          {onRemove && (file.status === "idle" || file.status === "error") && (
            <button
              className="bunny-upload-remove"
              onClick={() => onRemove(file.id)}
              aria-label={l.ariaRemoveFile(file.name)}
            >
              &times;
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
