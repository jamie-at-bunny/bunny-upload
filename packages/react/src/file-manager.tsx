import React, { useCallback, useMemo, useState } from "react";
import type { StorageEntry, FileManagerAction } from "@bunny.net/file-manager-core";
import { resolveLocale } from "@bunny.net/upload-shared";
import type { BunnyUploadLocale } from "@bunny.net/upload-shared";
import { useFileManager, type UseFileManagerOptions } from "./use-file-manager";
import { useBunnyUpload } from "./use-bunny-upload";
import {
  Breadcrumbs,
  ContentStatus,
  DefaultEntryActions,
  EntryCard,
  NewFolderEntry,
  UploadFileEntry,
  filterAndSortEntries,
} from "./file-manager-shared";

// ── Render-prop types (kept for backwards compat) ─────────────

export interface FileManagerRenderProps {
  entries: StorageEntry[];
  currentPath: string;
  status: string;
  error?: string;
  selected: StorageEntry[];
  selectedUrls: string[];
  breadcrumbs: { label: string; path: string }[];
  navigate: (path: string) => Promise<void>;
  goUp: () => Promise<void>;
  refresh: () => Promise<void>;
  toggleSelect: (guid: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  createFolder: (name: string) => Promise<void>;
  deleteEntry: (path: string) => Promise<void>;
  deleteSelected: () => Promise<void>;
  importFromUrl: (url: string, filename?: string) => Promise<void>;
  cdnUrl: (path: string) => string;
  downloadUrl: (path: string) => string;
  entryUrl: (entry: StorageEntry) => string;
  getActions: (entries?: StorageEntry[]) => FileManagerAction[];
  executeAction: (actionId: string, entries?: StorageEntry[]) => Promise<void>;
}

export interface FileManagerProps extends UseFileManagerOptions {
  /** View mode (default: "grid") */
  view?: "grid" | "list";
  /** Filter visible entries by file extension */
  accept?: string[];
  /** Allow selecting multiple entries (default: true) */
  allowMultiple?: boolean;
  /**
   * Enable uploads. `true` uses the default `/.bunny/upload` endpoint.
   * Pass a string to use a custom endpoint.
   */
  withUploads?: boolean | string;
  /** Enable per-entry and footer actions */
  withActions?: FileManagerAction[];
  /**
   * Custom render for per-entry actions. When provided, overrides the
   * default action button + dropdown.
   */
  renderEntryActions?: (props: {
    entry: StorageEntry;
    url: string;
    actions: FileManagerAction[];
    executeAction: (actionId: string) => Promise<void>;
  }) => React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /**
   * Render-prop children for fully custom UI.
   * When provided, the built-in UI is skipped entirely.
   */
  children?: (props: FileManagerRenderProps) => React.ReactNode;
  /** Override user-facing strings for i18n */
  locale?: Partial<BunnyUploadLocale>;
}

const DEFAULT_UPLOAD_ENDPOINT = "/.bunny/upload";

/**
 * Embedded file manager with selection, actions, and optional uploads.
 *
 * Can be used as a built-in UI component or as a render-prop for full control.
 *
 * @example
 * ```tsx
 * // Built-in UI
 * <FileManager withUploads withActions={[copyUrlAction, downloadAction]} />
 *
 * // Render-prop (full control)
 * <FileManager>
 *   {({ entries, navigate, toggleSelect }) => ( ... )}
 * </FileManager>
 * ```
 */
export function FileManager({
  view = "grid",
  accept,
  allowMultiple = true,
  withUploads,
  withActions,
  renderEntryActions,
  className,
  children,
  locale: localeOverrides,
  ...options
}: FileManagerProps) {
  const l = resolveLocale(localeOverrides);
  const fm = useFileManager({
    ...options,
    actions: withActions ?? options.actions,
  });

  const entryUrl = (entry: StorageEntry) =>
    fm.cdnUrl(`${entry.path}${entry.objectName}`);

  const selectedUrls = fm.selected
    .filter((e) => !e.isDirectory)
    .map((e) => fm.cdnUrl(`${e.path}${e.objectName}`));

  // ── Render-prop mode ──────────────────────────────────────
  if (children) {
    return (
      <>
        {children({
          ...fm,
          entryUrl,
          selectedUrls,
        })}
      </>
    );
  }

  // ── Built-in UI mode ──────────────────────────────────────

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

  const visibleEntries = filterAndSortEntries(fm.entries, accept);
  const hasActions = !!(withActions && withActions.length > 0);

  const handleEntryClick = (entry: StorageEntry) => {
    if (entry.isDirectory) {
      fm.navigate(`${entry.path}${entry.objectName}/`);
      return;
    }
    if (!allowMultiple) {
      const isSelected = fm.selected.some((s) => s.guid === entry.guid);
      fm.deselectAll();
      if (!isSelected) fm.toggleSelect(entry.guid);
    } else {
      fm.toggleSelect(entry.guid);
    }
  };

  return (
    <div className={`bunny-fm ${className ?? ""}`.trim()}>
      {/* Header */}
      <div className="bunny-fm__header">
        <Breadcrumbs
          breadcrumbs={fm.breadcrumbs}
          currentPath={fm.currentPath}
          onNavigate={fm.navigate}
          locale={l}
        />
        <div className="bunny-fm__header-actions">
          {fm.selected.length > 0 && (
            <>
              <span className="bunny-fm__selection-count">
                {l.selectedCount(fm.selected.length)}
              </span>
              <button
                type="button"
                className="bunny-fm__action-btn bunny-fm__action-btn--danger"
                onClick={() => {
                  if (confirm(l.deleteCountConfirm(fm.selected.length))) {
                    fm.deleteSelected();
                  }
                }}
              >
                {l.delete}
              </button>
            </>
          )}
        </div>
      </div>

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
          locale={l}
        />

        {fm.status === "idle" && (
          <div className={view === "grid" ? "bunny-fm__grid" : "bunny-fm__list"}>
            <NewFolderEntry onCreate={fm.createFolder} locale={l} />
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
                  allowMultiple={allowMultiple}
                  onClick={() => handleEntryClick(entry)}
                  onSelect={
                    entry.isDirectory
                      ? () => fm.toggleSelect(entry.guid)
                      : undefined
                  }
                  locale={l}
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
                          if (confirm(l.deleteConfirm(entry.objectName))) {
                            fm.deleteEntry(path);
                          }
                        }}
                        locale={l}
                      />
                    )
                  }
                />
              );
            })}
            {uploadEndpoint && (
              <UploadFileEntry endpoint={uploadEndpoint} onUploaded={fm.refresh} locale={l} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
