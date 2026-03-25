import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FileState, UploadResult } from "@bunny.net/upload-core";
import { formatBytes } from "@bunny.net/upload-core";
import type { StorageEntry } from "@bunny.net/file-manager-core";
import { useBunnyUpload } from "./use-bunny-upload";
import { useFileManager, type UseFileManagerOptions } from "./use-file-manager";
import {
  Breadcrumbs,
  ContentStatus,
  EntryCard,
  NewFolderEntry,
  filterAndSortEntries,
} from "./file-manager-shared";

export interface UploadWidgetProps {
  endpoint?: string;
  accept?: string[];
  maxSize?: string | number;
  maxFiles?: number;
  onComplete?: (files: UploadResult[]) => void;
  onError?: (error: Error, file?: FileState) => void;
  autoUpload?: boolean;
  /** Label for the trigger button */
  label?: string;
  /** Custom trigger element — receives `open` function */
  trigger?: (props: { open: () => void }) => React.ReactNode;
  /**
   * Show a "Browse" tab with the file manager.
   * `true` uses default file manager options.
   * Pass an object to configure endpoint, cdnBase, etc.
   */
  withFileManager?: boolean | UseFileManagerOptions;
}

export function UploadWidget({
  endpoint,
  accept,
  maxSize,
  maxFiles,
  onComplete,
  onError,
  autoUpload = true,
  label = "Upload files",
  trigger,
  withFileManager,
}: UploadWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"upload" | "browse">("upload");
  const { files, addFiles, removeFile, upload, reset, isUploading } =
    useBunnyUpload({ endpoint, accept, maxSize, maxFiles, onComplete, onError });

  const hasBrowse = !!withFileManager;

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    setTab("upload");
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    reset();
  }, [reset]);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      addFiles(fileList);
      if (autoUpload) {
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

  const acceptString = accept?.join(",");
  const allComplete = files.length > 0 && files.every((f) => f.status === "complete");

  return (
    <>
      {trigger ? (
        trigger({ open })
      ) : (
        <button type="button" className="bunny-widget-trigger" onClick={open}>
          {label}
        </button>
      )}

      {isOpen && (
        <dialog
          ref={dialogRef}
          className="bunny-widget-dialog"
          onClose={close}
          onClick={(e) => {
            if (e.target === dialogRef.current) close();
          }}
        >
          <div className="bunny-widget">
            <div className="bunny-widget-header">
              {hasBrowse ? (
                <div className="bunny-widget-tabs">
                  <button
                    type="button"
                    className={`bunny-widget-tab${tab === "upload" ? " bunny-widget-tab--active" : ""}`}
                    onClick={() => setTab("upload")}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    className={`bunny-widget-tab${tab === "browse" ? " bunny-widget-tab--active" : ""}`}
                    onClick={() => setTab("browse")}
                  >
                    Browse
                  </button>
                </div>
              ) : (
                <span className="bunny-widget-title">{label}</span>
              )}
              <button
                type="button"
                className="bunny-widget-close"
                onClick={close}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {tab === "upload" && (
              <>
                <div
                  className={`bunny-widget-dropzone ${isDragOver ? "bunny-widget-dropzone--active" : ""}`}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                  }}
                  onClick={() => inputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      inputRef.current?.click();
                  }}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    multiple={maxFiles !== 1}
                    accept={acceptString}
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        handleFiles(e.target.files);
                        e.target.value = "";
                      }
                    }}
                    style={{ display: "none" }}
                  />
                  <p className="bunny-widget-dropzone-text">
                    {isDragOver
                      ? "Drop to upload"
                      : "Drop files here or click to browse"}
                  </p>
                  {maxSize && (
                    <p className="bunny-widget-hint">
                      Max{" "}
                      {typeof maxSize === "string"
                        ? maxSize
                        : formatBytes(maxSize)}
                      {maxFiles && ` · ${maxFiles} file${maxFiles > 1 ? "s" : ""}`}
                    </p>
                  )}
                </div>

                {files.length > 0 && (
                  <ul className="bunny-widget-file-list">
                    {files.map((file) => (
                      <li
                        key={file.id}
                        className={`bunny-widget-file bunny-widget-file--${file.status}`}
                      >
                        <span className="bunny-widget-file-name">{file.name}</span>
                        <span className="bunny-widget-file-size">
                          {formatBytes(file.size)}
                        </span>

                        {file.status === "uploading" && (
                          <div className="bunny-widget-progress">
                            <div
                              className="bunny-widget-progress-bar"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        )}

                        {file.status === "complete" && (
                          <span className="bunny-widget-file-complete">✓</span>
                        )}

                        {file.status === "error" && (
                          <span className="bunny-widget-file-error">
                            {file.error ?? "Failed"}
                          </span>
                        )}

                        {(file.status === "idle" || file.status === "error") && (
                          <button
                            className="bunny-widget-file-remove"
                            onClick={() => removeFile(file.id)}
                            aria-label={`Remove ${file.name}`}
                          >
                            &times;
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="bunny-widget-footer">
                  {!autoUpload && files.some((f) => f.status === "idle") && (
                    <button
                      type="button"
                      className="bunny-widget-upload"
                      onClick={() => upload()}
                      disabled={isUploading}
                    >
                      {isUploading ? "Uploading..." : "Upload"}
                    </button>
                  )}
                  {allComplete && (
                    <button
                      type="button"
                      className="bunny-widget-done"
                      onClick={close}
                    >
                      Done
                    </button>
                  )}
                </div>
              </>
            )}

            {tab === "browse" && hasBrowse && (
              <BrowseTab
                options={typeof withFileManager === "object" ? withFileManager : {}}
                onSelect={(urls) => {
                  onComplete?.(urls.map((url) => ({
                    name: url.split("/").pop() ?? "",
                    path: new URL(url).pathname,
                    size: 0,
                    url,
                  })));
                  close();
                }}
              />
            )}
          </div>
        </dialog>
      )}
    </>
  );
}

// ── Browse tab ────────────────────────────────────────────────

function BrowseTab({
  options,
  onSelect,
}: {
  options: UseFileManagerOptions;
  onSelect: (urls: string[]) => void;
}) {
  const fm = useFileManager(options);
  const visibleEntries = useMemo(
    () => filterAndSortEntries(fm.entries),
    [fm.entries]
  );

  const selectedUrls = fm.selected
    .filter((e) => !e.isDirectory)
    .map((e) => fm.cdnUrl(`${e.path}${e.objectName}`));

  const handleEntryClick = useCallback(
    (entry: StorageEntry) => {
      if (entry.isDirectory) {
        fm.navigate(`${entry.path}${entry.objectName}/`);
        return;
      }
      fm.toggleSelect(entry.guid);
    },
    [fm]
  );

  return (
    <>
      <Breadcrumbs
        breadcrumbs={fm.breadcrumbs}
        currentPath={fm.currentPath}
        onNavigate={fm.navigate}
      />

      <div className="bunny-fm__content">
        <ContentStatus
          status={fm.status}
          error={fm.error}
          isEmpty={false}
          onRetry={fm.refresh}
        />

        {fm.status === "idle" && (
          <div className="bunny-fm__grid">
            <NewFolderEntry onCreate={fm.createFolder} />
            {visibleEntries.map((entry) => {
              const isSelected = fm.selected.some((s) => s.guid === entry.guid);
              const url = fm.cdnUrl(`${entry.path}${entry.objectName}`);

              return (
                <EntryCard
                  key={entry.guid}
                  entry={entry}
                  url={url}
                  isSelected={isSelected}
                  showSelection
                  onClick={() => handleEntryClick(entry)}
                  onSelect={
                    entry.isDirectory
                      ? () => fm.toggleSelect(entry.guid)
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="bunny-widget-footer">
        {fm.selected.length > 0 && (
          <button
            type="button"
            className="bunny-widget-upload"
            onClick={() => onSelect(selectedUrls)}
          >
            Select {fm.selected.length} file{fm.selected.length > 1 ? "s" : ""}
          </button>
        )}
      </div>
    </>
  );
}
