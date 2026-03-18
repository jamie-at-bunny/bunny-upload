import React, { useCallback, useRef, useState } from "react";
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
}: BunnyUploadProps) {
  const { files, addFiles, removeFile, upload, isUploading } = useBunnyUpload({
    endpoint,
    accept,
    maxSize,
    maxFiles,
    onComplete,
    onError,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      addFiles(fileList);
      if (autoUpload) {
        // Allow state to update before uploading
        queueMicrotask(() => upload());
      }
    },
    [addFiles, autoUpload, upload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        e.target.value = "";
      }
    },
    [handleFiles]
  );

  const acceptString = accept?.join(",");

  return (
    <div className={`bunny-upload ${className ?? ""}`.trim()}>
      <div
        className={`bunny-upload-dropzone ${isDragOver ? "bunny-upload-dropzone--active" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles !== 1}
          accept={acceptString}
          onChange={handleInputChange}
          style={{ display: "none" }}
        />
        <div className="bunny-upload-dropzone-text">
          <p>Drop files here or click to browse</p>
          {maxSize && (
            <p className="bunny-upload-hint">
              Max size: {typeof maxSize === "string" ? maxSize : formatBytes(maxSize)}
            </p>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <ul className="bunny-upload-file-list">
          {files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onRemove={removeFile}
              onRetry={() => upload()}
            />
          ))}
        </ul>
      )}

      {!autoUpload && files.some((f) => f.status === "idle") && (
        <button
          className="bunny-upload-button"
          onClick={() => upload()}
          disabled={isUploading}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      )}
    </div>
  );
}

function FileItem({
  file,
  onRemove,
  onRetry,
}: {
  file: FileState;
  onRemove: (id: string) => void;
  onRetry: () => void;
}) {
  return (
    <li className={`bunny-upload-file bunny-upload-file--${file.status}`}>
      <div className="bunny-upload-file-info">
        <span className="bunny-upload-file-name">{file.name}</span>
        <span className="bunny-upload-file-size">{formatBytes(file.size)}</span>
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
          <button
            className="bunny-upload-retry"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}

      {file.status === "complete" && (
        <span className="bunny-upload-file-complete">Uploaded</span>
      )}

      {(file.status === "idle" || file.status === "error") && (
        <button
          className="bunny-upload-remove"
          onClick={() => onRemove(file.id)}
          aria-label={`Remove ${file.name}`}
        >
          &times;
        </button>
      )}
    </li>
  );
}
