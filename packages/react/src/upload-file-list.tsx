import type { FileState } from "@bunny.net/upload-core";
import { formatBytes } from "@bunny.net/upload-core";

export interface UploadFileListProps {
  files: FileState[];
  onRemove?: (id: string) => void;
  onRetry?: () => void;
  className?: string;
}

export function UploadFileList({
  files,
  onRemove,
  onRetry,
  className,
}: UploadFileListProps) {
  if (files.length === 0) return null;

  return (
    <ul className={`bunny-upload-file-list ${className ?? ""}`.trim()}>
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
            <div className="bunny-upload-progress">
              <div
                className="bunny-upload-progress-bar"
                style={{ width: `${file.progress}%` }}
              />
            </div>
          )}

          {file.status === "error" && (
            <div className="bunny-upload-file-error">
              <span>{file.error}</span>
              {onRetry && (
                <button className="bunny-upload-retry" onClick={onRetry}>
                  Retry
                </button>
              )}
            </div>
          )}

          {file.status === "complete" && (
            <span className="bunny-upload-file-complete">Uploaded</span>
          )}

          {onRemove && (file.status === "idle" || file.status === "error") && (
            <button
              className="bunny-upload-remove"
              onClick={() => onRemove(file.id)}
              aria-label={`Remove ${file.name}`}
            >
              &times;
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
