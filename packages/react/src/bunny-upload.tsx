import { useCallback, useRef } from "react";
import type { FileState, UploadResult } from "@bunny.net/upload-core";
import { formatBytes } from "@bunny.net/upload-core";
import { useBunnyUpload } from "./use-bunny-upload";

export interface BunnyUploadProps {
  endpoint?: string;
  accept?: string[];
  maxSize?: string | number;
  maxFiles?: number;
  onComplete?: (files: UploadResult[]) => void;
  onError?: (error: Error, file?: FileState) => void;
  className?: string;
  autoUpload?: boolean;
  /** Label shown on the button */
  label?: string;
}

export function BunnyUpload({
  endpoint,
  accept,
  maxSize,
  maxFiles,
  onComplete,
  onError,
  className,
  autoUpload = true,
  label = "Choose file",
}: BunnyUploadProps) {
  const { files, addFiles, upload, isUploading } = useBunnyUpload({
    endpoint,
    accept,
    maxSize,
    maxFiles,
    onComplete,
    onError,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
        if (autoUpload) {
          queueMicrotask(() => upload());
        }
        e.target.value = "";
      }
    },
    [addFiles, autoUpload, upload]
  );

  const acceptString = accept?.join(",");
  const latestFile = files.length > 0 ? files[files.length - 1] : null;

  return (
    <div className={`bunny-upload ${className ?? ""}`.trim()}>
      <button
        type="button"
        className="bunny-upload-button"
        onClick={handleClick}
        disabled={isUploading}
      >
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple={maxFiles !== 1}
        accept={acceptString}
        onChange={handleInputChange}
        style={{ display: "none" }}
      />
      {latestFile && (
        <span className="bunny-upload-status">
          <span className="bunny-upload-filename">{latestFile.name}</span>
          {latestFile.status === "uploading" && (
            <span className="bunny-upload-progress">
              {Math.round(latestFile.progress)}%
            </span>
          )}
          {latestFile.status === "complete" && (
            <span className="bunny-upload-complete">Uploaded</span>
          )}
          {latestFile.status === "error" && (
            <span className="bunny-upload-error">
              {latestFile.error ?? "Failed"}
            </span>
          )}
          {latestFile.status === "idle" && (
            <span className="bunny-upload-size">
              {formatBytes(latestFile.size)}
            </span>
          )}
        </span>
      )}
      {files.length > 1 && (
        <span className="bunny-upload-count">+{files.length - 1} more</span>
      )}
    </div>
  );
}
