import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StorageEntry, FileManagerAction } from "@bunny.net/file-manager-core";
import { useFileManager, type UseFileManagerOptions } from "./use-file-manager";

// ── Image helpers ──────────────────────────────────────────────

const IMAGE_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", "ico", "bmp", "avif",
]);

function getExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isImageEntry(entry: StorageEntry): boolean {
  return !entry.isDirectory && IMAGE_EXTENSIONS.has(getExtension(entry.objectName));
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return "";
  }
}

/** Stable key for an entry: path + name */
function entryKey(entry: StorageEntry): string {
  return `${entry.path}${entry.objectName}`;
}

// ── Types ──────────────────────────────────────────────────────

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

// ── BEM class names ────────────────────────────────────────────
//
// Block: bunny-fm
//
// bunny-fm                        — root wrapper inside dialog
// bunny-fm__dialog                — the <dialog> element
// bunny-fm__header                — header bar
// bunny-fm__title                 — title text
// bunny-fm__close                 — close button
// bunny-fm__breadcrumbs           — breadcrumb nav
// bunny-fm__breadcrumb            — individual breadcrumb button
// bunny-fm__breadcrumb--active    — current directory breadcrumb
// bunny-fm__breadcrumb-sep        — separator between breadcrumbs
// bunny-fm__content               — main scrollable area
// bunny-fm__grid                  — grid layout container
// bunny-fm__list                  — list layout container
// bunny-fm__loading               — loading state
// bunny-fm__error                 — error state
// bunny-fm__empty                 — empty state
// bunny-fm__retry                 — retry button inside error
// bunny-fm__entry                 — a file or directory item
// bunny-fm__entry--selected       — selected entry modifier
// bunny-fm__entry--dir            — directory entry modifier
// bunny-fm__entry-thumb           — thumbnail container
// bunny-fm__entry-img             — image thumbnail
// bunny-fm__entry-icon            — icon for folder/file
// bunny-fm__entry-icon--folder    — folder icon modifier
// bunny-fm__entry-icon--file      — file icon modifier
// bunny-fm__entry-check           — selection checkbox/radio wrapper
// bunny-fm__entry-check--visible  — visible when hovered or selected
// bunny-fm__entry-name            — file name text
// bunny-fm__entry-meta            — file size text
// bunny-fm__entry-date            — date text
// bunny-fm__entry-actions         — per-entry action buttons container
// bunny-fm__footer                — footer bar
// bunny-fm__selection-count       — "N selected" text
// bunny-fm__footer-actions        — action buttons container
// bunny-fm__confirm               — default confirm button
// bunny-fm__trigger               — default trigger button

// ── Component ──────────────────────────────────────────────────

export function FileManagerWidget({
  allowMultiple = true,
  accept,
  value,
  onSelect,
  renderEntryActions,
  renderActions,
  trigger,
  label = "Browse files",
  view = "grid",
  ...options
}: FileManagerWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const fm = useFileManager(options);

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

  // Filter entries by accepted extensions
  const acceptSet = useMemo(
    () => (accept ? new Set(accept.map((a) => a.replace(/^\./, "").toLowerCase())) : null),
    [accept]
  );

  const visibleEntries = useMemo(() => {
    let entries = fm.entries;
    if (acceptSet) {
      entries = entries.filter(
        (e) => e.isDirectory || acceptSet.has(getExtension(e.objectName))
      );
    }
    // Sort: directories first, then alphabetical
    return [...entries].sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.objectName.localeCompare(b.objectName);
    });
  }, [fm.entries, acceptSet]);

  const selectedUrls = fm.selected
    .filter((e) => !e.isDirectory)
    .map((e) => fm.cdnUrl(`${e.path}${e.objectName}`));

  // In single-select mode with onSelect (and no renderActions), clicking a file
  // immediately fires the callback and closes — no confirm step needed.
  const instantSelect = !allowMultiple && !!onSelect && !renderActions;

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
        // Single-select: deselect all, then select this one (or toggle off)
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
        >
          <div className="bunny-fm">
            {/* Header */}
            <div className="bunny-fm__header">
              <span className="bunny-fm__title">{label}</span>
              <button
                type="button"
                className="bunny-fm__close"
                onClick={close}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Breadcrumbs */}
            <nav className="bunny-fm__breadcrumbs" aria-label="File navigation">
              {fm.breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.path}>
                  {i > 0 && (
                    <span className="bunny-fm__breadcrumb-sep">/</span>
                  )}
                  <button
                    type="button"
                    className={`bunny-fm__breadcrumb${
                      crumb.path === fm.currentPath
                        ? " bunny-fm__breadcrumb--active"
                        : ""
                    }`}
                    onClick={() => fm.navigate(crumb.path)}
                  >
                    {crumb.label}
                  </button>
                </React.Fragment>
              ))}
            </nav>

            {/* Content */}
            <div className="bunny-fm__content">
              {fm.status === "loading" && (
                <div className="bunny-fm__loading">Loading…</div>
              )}

              {fm.status === "error" && (
                <div className="bunny-fm__error">
                  {fm.error}
                  <button
                    type="button"
                    className="bunny-fm__retry"
                    onClick={() => fm.refresh()}
                  >
                    Retry
                  </button>
                </div>
              )}

              {fm.status === "idle" && visibleEntries.length === 0 && (
                <div className="bunny-fm__empty">No files found</div>
              )}

              {fm.status === "idle" && visibleEntries.length > 0 && (
                <div
                  className={
                    view === "grid" ? "bunny-fm__grid" : "bunny-fm__list"
                  }
                >
                  {visibleEntries.map((entry) => {
                    const isSelected = fm.selected.some(
                      (s) => s.guid === entry.guid
                    );
                    const isImage = isImageEntry(entry);
                    const url = fm.cdnUrl(
                      `${entry.path}${entry.objectName}`
                    );

                    return (
                      <div
                        key={entry.guid}
                        className={`bunny-fm__entry${
                          isSelected ? " bunny-fm__entry--selected" : ""
                        }${entry.isDirectory ? " bunny-fm__entry--dir" : ""}`}
                        onClick={() => handleEntryClick(entry)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleEntryClick(entry);
                          }
                        }}
                      >
                        {/* Thumbnail */}
                        <div className="bunny-fm__entry-thumb">
                          {entry.isDirectory ? (
                            <span className="bunny-fm__entry-icon bunny-fm__entry-icon--folder" />
                          ) : isImage ? (
                            <img
                              src={url}
                              alt={entry.objectName}
                              className="bunny-fm__entry-img"
                              loading="lazy"
                            />
                          ) : (
                            <span className="bunny-fm__entry-icon bunny-fm__entry-icon--file" />
                          )}

                          {/* Selection indicator */}
                          {!entry.isDirectory && !instantSelect && (
                            <span
                              className={`bunny-fm__entry-check${
                                isSelected
                                  ? " bunny-fm__entry-check--visible"
                                  : ""
                              }`}
                            >
                              <input
                                type={allowMultiple ? "checkbox" : "radio"}
                                checked={isSelected}
                                onChange={() => handleEntryClick(entry)}
                                onClick={(e) => e.stopPropagation()}
                                tabIndex={-1}
                              />
                            </span>
                          )}
                        </div>

                        {/* Name */}
                        <span
                          className="bunny-fm__entry-name"
                          title={entry.objectName}
                        >
                          {entry.objectName}
                        </span>

                        {/* Meta */}
                        {!entry.isDirectory && (
                          <span className="bunny-fm__entry-meta">
                            {formatFileSize(entry.length)}
                          </span>
                        )}
                        <span className="bunny-fm__entry-date">
                          {formatDate(entry.lastChanged)}
                        </span>

                        {/* Per-entry actions */}
                        {renderEntryActions ? (
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
                            actions={fm.getActions([entry])}
                            executeAction={(actionId) =>
                              fm.executeAction(actionId, [entry])
                            }
                          />
                        )}
                      </div>
                    );
                  })}
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
                {/* Custom actions from user */}
                {renderActions &&
                  fm.selected.length > 0 &&
                  renderActions({
                    selected: fm.selected,
                    urls: selectedUrls,
                    actions: fm.getActions(),
                    executeAction: fm.executeAction,
                    deselectAll: fm.deselectAll,
                  })}

                {/* Default confirm button (only if onSelect is provided) */}
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

// ── Default per-entry actions ─────────────────────────────────

function DefaultEntryActions({
  actions,
  executeAction,
}: {
  actions: FileManagerAction[];
  executeAction: (actionId: string) => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [menuOpen]);

  if (actions.length === 0) return null;

  const [primary, ...rest] = actions;

  return (
    <div className="bunny-fm__entry-actions" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="bunny-fm__action-btn"
        onClick={() => executeAction(primary.id)}
      >
        {primary.label}
      </button>
      {rest.length > 0 && (
        <div className="bunny-fm__action-menu" ref={menuRef}>
          <button
            type="button"
            className="bunny-fm__action-btn bunny-fm__action-more"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More actions"
          >
            &hellip;
          </button>
          {menuOpen && (
            <div className="bunny-fm__action-dropdown">
              {rest.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="bunny-fm__action-dropdown-item"
                  onClick={() => {
                    executeAction(action.id);
                    setMenuOpen(false);
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
