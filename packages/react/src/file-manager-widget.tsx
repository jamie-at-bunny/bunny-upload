import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StorageEntry, FileManagerAction } from "@bunny.net/file-manager-core";
import { useFileManager, type UseFileManagerOptions } from "./use-file-manager";
import { useBunnyUpload } from "./use-bunny-upload";
import {
  Breadcrumbs,
  ContentStatus,
  DefaultEntryActions,
  EntryCard,
  NewFolderEntry,
  UploadFileEntry,
  entryKey,
  filterAndSortEntries,
} from "./file-manager-shared";

export interface FileManagerWidgetProps extends UseFileManagerOptions {
  /** Allow selecting multiple files (default: true) */
  allowMultiple?: boolean;
  /** Filter visible entries by file extension */
  accept?: string[];
  /**
   * Controlled value — pre-select entries matching these paths.
   * Paths should be in the form "/dir/file.jpg" (entry.path + entry.objectName).
   */
  value?: string[];
  /** Called when the user confirms their selection */
  onSelect?: (entries: StorageEntry[], urls: string[]) => void;
  /**
   * Enable uploads. `true` uses the default `/.bunny/upload` endpoint.
   * Pass a string to use a custom endpoint.
   */
  withUploads?: boolean | string;
  /** Enable per-entry and footer actions */
  withActions?: FileManagerAction[];
  /**
   * Render custom actions for each individual entry in the grid/list.
   * Receives the entry, its CDN URL, and an executeAction helper.
   */
  renderEntryActions?: (props: {
    entry: StorageEntry;
    url: string;
    actions: FileManagerAction[];
    executeAction: (actionId: string) => Promise<void>;
  }) => React.ReactNode;
  /**
   * Render custom actions in the footer when files are selected.
   * Receives the selected entries, their CDN URLs, applicable actions,
   * and helpers.
   */
  renderActions?: (props: {
    selected: StorageEntry[];
    urls: string[];
    actions: FileManagerAction[];
    executeAction: (actionId: string) => Promise<void>;
    deselectAll: () => void;
  }) => React.ReactNode;
  /** Custom trigger element — receives `open` function */
  trigger?: (props: { open: () => void }) => React.ReactNode;
  /** Label for the default trigger button */
  label?: string;
  /** View mode (default: "grid") */
  view?: "grid" | "list";
}

const DEFAULT_UPLOAD_ENDPOINT = "/.bunny/upload";

export function FileManagerWidget({
  allowMultiple = true,
  accept,
  value,
  onSelect,
  withUploads,
  withActions,
  renderEntryActions,
  renderActions,
  trigger,
  label = "Browse files",
  view = "grid",
  ...options
}: FileManagerWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const fm = useFileManager({
    ...options,
    actions: withActions ?? options.actions,
  });

  const baseUploadEndpoint =
    withUploads === true
      ? DEFAULT_UPLOAD_ENDPOINT
      : typeof withUploads === "string"
        ? withUploads
        : null;

  const uploadEndpoint = baseUploadEndpoint
    ? `${baseUploadEndpoint}?dir=${encodeURIComponent(fm.currentPath)}`
    : null;

  const uploader = useBunnyUpload({
    endpoint: uploadEndpoint ?? undefined,
    onComplete: () => fm.refresh(),
  });

  const [isDragOver, setIsDragOver] = useState(false);

  const dropzoneHandlers = uploadEndpoint
    ? {
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            uploader.addFiles(e.dataTransfer.files);
            uploader.upload();
          }
        },
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          setIsDragOver(true);
        },
        onDragLeave: (e: React.DragEvent) => {
          e.preventDefault();
          setIsDragOver(false);
        },
      }
    : {};

  // Track the last-confirmed selection as stable path keys so we can
  // restore them when the dialog reopens (entries may have been re-fetched
  // with fresh guids after a navigate).
  const [confirmedKeys, setConfirmedKeys] = useState<Set<string>>(
    () => new Set(value ?? [])
  );

  // Sync external `value` prop into confirmedKeys
  useEffect(() => {
    if (value) {
      setConfirmedKeys(new Set(value));
    }
  }, [value]);

  // When the dialog opens or entries change while open, restore selection
  // from confirmedKeys so previously picked files appear checked.
  useEffect(() => {
    if (!isOpen || confirmedKeys.size === 0) return;

    for (const entry of fm.entries) {
      if (confirmedKeys.has(entryKey(entry))) {
        if (!fm.selected.some((s) => s.guid === entry.guid)) {
          fm.toggleSelect(entry.guid);
        }
      }
    }
  }, [isOpen, fm.entries]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    fm.deselectAll();
  }, [fm]);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  const visibleEntries = useMemo(
    () => filterAndSortEntries(fm.entries, accept),
    [fm.entries, accept]
  );

  const selectedUrls = fm.selected
    .filter((e) => !e.isDirectory)
    .map((e) => fm.cdnUrl(`${e.path}${e.objectName}`));

  // In single-select mode with onSelect (and no renderActions), clicking a file
  // immediately fires the callback and closes — no confirm step needed.
  const instantSelect = !allowMultiple && !!onSelect && !renderActions;
  const hasActions = !!(withActions && withActions.length > 0);

  const handleEntryClick = useCallback(
    (entry: StorageEntry) => {
      if (entry.isDirectory) {
        fm.navigate(`${entry.path}${entry.objectName}/`);
        return;
      }

      if (instantSelect) {
        const key = entryKey(entry);
        const url = fm.cdnUrl(key);
        setConfirmedKeys(new Set([key]));
        onSelect!([entry], [url]);
        setIsOpen(false);
        fm.deselectAll();
        return;
      }

      if (!allowMultiple) {
        const isSelected = fm.selected.some((s) => s.guid === entry.guid);
        fm.deselectAll();
        if (!isSelected) {
          fm.toggleSelect(entry.guid);
        }
      } else {
        fm.toggleSelect(entry.guid);
      }
    },
    [fm, allowMultiple, instantSelect, onSelect]
  );

  const handleConfirm = useCallback(() => {
    setConfirmedKeys(new Set(fm.selected.map(entryKey)));
    onSelect?.(fm.selected, selectedUrls);
    close();
  }, [fm.selected, selectedUrls, onSelect, close]);

  const handleUpload = async (files: FileList) => {
    if (!uploadEndpoint) return;
    const form = new FormData();
    for (const file of Array.from(files)) {
      form.append("file", file);
    }
    await fetch(uploadEndpoint, { method: "POST", body: form });
    fm.refresh();
  };

  return (
    <>
      {trigger ? (
        trigger({ open })
      ) : (
        <button type="button" className="bunny-fm__trigger" onClick={open}>
          {label}
        </button>
      )}

      {isOpen && (
        <dialog
          ref={dialogRef}
          className="bunny-fm__dialog"
          onClose={close}
          onClick={(e) => {
            if (e.target === dialogRef.current) close();
          }}
          aria-modal="true"
          aria-label={label}
        >
          <div className="bunny-fm">
            {/* Header */}
            <div className="bunny-fm__header">
              <span className="bunny-fm__title">{label}</span>
              <div className="bunny-fm__header-actions">
                <button
                  type="button"
                  className="bunny-fm__close"
                  onClick={close}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Breadcrumbs */}
            <Breadcrumbs
              breadcrumbs={fm.breadcrumbs}
              currentPath={fm.currentPath}
              onNavigate={fm.navigate}
            />

            {/* Content */}
            <div
              className={`bunny-fm__content${isDragOver ? " bunny-fm__content--drag-over" : ""}`}
              {...dropzoneHandlers}
            >
              <ContentStatus
                status={fm.status}
                error={fm.error}
                isEmpty={false}
                onRetry={fm.refresh}
              />

              {fm.status === "idle" && (
                <div
                  className={
                    view === "grid" ? "bunny-fm__grid" : "bunny-fm__list"
                  }
                >
                  <NewFolderEntry onCreate={fm.createFolder} />
                  {visibleEntries.map((entry) => {
                    const isSelected = fm.selected.some(
                      (s) => s.guid === entry.guid
                    );
                    const url = fm.cdnUrl(
                      `${entry.path}${entry.objectName}`
                    );

                    return (
                      <EntryCard
                        key={entry.guid}
                        entry={entry}
                        url={url}
                        isSelected={isSelected}
                        showSelection={!instantSelect}
                        allowMultiple={allowMultiple}
                        onClick={() => handleEntryClick(entry)}
                        onSelect={
                          entry.isDirectory
                            ? () => fm.toggleSelect(entry.guid)
                            : undefined
                        }
                        renderActions={
                          renderEntryActions && hasActions && !entry.isDirectory ? (
                            <div
                              className="bunny-fm__entry-actions"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {renderEntryActions({
                                entry,
                                url,
                                actions: fm.getActions([entry]),
                                executeAction: (actionId) =>
                                  fm.executeAction(actionId, [entry]),
                              })}
                            </div>
                          ) : (
                            <DefaultEntryActions
                              actions={hasActions && !entry.isDirectory ? fm.getActions([entry]) : []}
                              executeAction={(actionId) =>
                                fm.executeAction(actionId, [entry])
                              }
                              onDelete={() => {
                                const path = entry.isDirectory
                                  ? `${entry.path}${entry.objectName}/`
                                  : `${entry.path}${entry.objectName}`;
                                if (confirm(`Delete "${entry.objectName}"?`)) {
                                  fm.deleteEntry(path);
                                }
                              }}
                            />
                          )
                        }
                      />
                    );
                  })}
                  {uploadEndpoint && (
                    <UploadFileEntry endpoint={uploadEndpoint} onUploaded={fm.refresh} />
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bunny-fm__footer">
              <span className="bunny-fm__selection-count">
                {fm.selected.length > 0
                  ? `${fm.selected.length} selected`
                  : ""}
              </span>

              <div className="bunny-fm__footer-actions">
                {renderActions &&
                  fm.selected.length > 0 &&
                  renderActions({
                    selected: fm.selected,
                    urls: selectedUrls,
                    actions: fm.getActions(),
                    executeAction: fm.executeAction,
                    deselectAll: fm.deselectAll,
                  })}

                {onSelect && fm.selected.length > 0 && !renderActions && (
                  <button
                    type="button"
                    className="bunny-fm__confirm"
                    onClick={handleConfirm}
                  >
                    {allowMultiple
                      ? `Select ${fm.selected.length} file${
                          fm.selected.length > 1 ? "s" : ""
                        }`
                      : "Select"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}

