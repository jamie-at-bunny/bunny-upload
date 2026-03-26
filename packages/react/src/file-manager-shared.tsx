import React, { useEffect, useRef, useState } from "react";
import type { StorageEntry, FileManagerAction } from "@bunny.net/file-manager-core";
import { formatBytes, defaultLocale } from "@bunny.net/upload-shared";
import type { BunnyUploadLocale } from "@bunny.net/upload-shared";

// ── Image helpers ──────────────────────────────────────────────

const IMAGE_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", "ico", "bmp", "avif",
]);

function getExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isImageEntry(entry: StorageEntry): boolean {
  return !entry.isDirectory && IMAGE_EXTENSIONS.has(getExtension(entry.objectName));
}

export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return "";
  }
}

/** Stable key for an entry: path + name */
export function entryKey(entry: StorageEntry): string {
  return `${entry.path}${entry.objectName}`;
}

export function filterAndSortEntries(
  entries: StorageEntry[],
  accept?: string[] | null
): StorageEntry[] {
  const acceptSet = accept
    ? new Set(accept.map((a) => a.replace(/^\./, "").toLowerCase()))
    : null;

  let filtered = entries;
  if (acceptSet) {
    filtered = filtered.filter(
      (e) => e.isDirectory || acceptSet.has(getExtension(e.objectName))
    );
  }

  return [...filtered].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.objectName.localeCompare(b.objectName);
  });
}

// ── Shared UI pieces ──────────────────────────────────────────

export function Breadcrumbs({
  breadcrumbs,
  currentPath,
  onNavigate,
  locale: l = defaultLocale,
}: {
  breadcrumbs: { label: string; path: string }[];
  currentPath: string;
  onNavigate: (path: string) => void;
  locale?: BunnyUploadLocale;
}) {
  return (
    <nav className="bunny-fm__breadcrumbs" aria-label={l.ariaFileNavigation}>
      {breadcrumbs.map((crumb, i) => (
        <React.Fragment key={crumb.path}>
          {i > 0 && <span className="bunny-fm__breadcrumb-sep">/</span>}
          <button
            type="button"
            className={`bunny-fm__breadcrumb${
              crumb.path === currentPath ? " bunny-fm__breadcrumb--active" : ""
            }`}
            onClick={() => onNavigate(crumb.path)}
            {...(crumb.path === currentPath ? { "aria-current": "page" as const } : {})}
          >
            {crumb.label}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}

export function ContentStatus({
  status,
  error,
  isEmpty,
  onRetry,
  locale: l = defaultLocale,
}: {
  status: string;
  error?: string;
  isEmpty: boolean;
  onRetry: () => void;
  locale?: BunnyUploadLocale;
}) {
  if (status === "loading") {
    return <div className="bunny-fm__loading" role="status" aria-live="polite">{l.loading}</div>;
  }
  if (status === "error") {
    return (
      <div className="bunny-fm__error" role="alert">
        {error}
        <button type="button" className="bunny-fm__retry" onClick={onRetry}>
          {l.retry}
        </button>
      </div>
    );
  }
  if (status === "idle" && isEmpty) {
    return <div className="bunny-fm__empty">{l.noFilesFound}</div>;
  }
  return null;
}

export interface EntryCardProps {
  entry: StorageEntry;
  url: string;
  isSelected?: boolean;
  showSelection?: boolean;
  allowMultiple?: boolean;
  onClick: () => void;
  onSelect?: () => void;
  onDelete?: () => void;
  renderActions?: React.ReactNode;
  locale?: BunnyUploadLocale;
}

export function EntryCard({
  entry,
  url,
  isSelected = false,
  showSelection = false,
  allowMultiple = true,
  onClick,
  onSelect,
  onDelete,
  renderActions,
  locale: l = defaultLocale,
}: EntryCardProps) {
  const isImage = isImageEntry(entry);

  return (
    <div
      className={`bunny-fm__entry${
        isSelected ? " bunny-fm__entry--selected" : ""
      }${entry.isDirectory ? " bunny-fm__entry--dir" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={l.ariaEntryLabel(entry.isDirectory ? "folder" : "file", entry.objectName, isSelected)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
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

        {showSelection && (
          <span
            className={`bunny-fm__entry-check${
              isSelected ? " bunny-fm__entry-check--visible" : ""
            }`}
          >
            <input
              type={allowMultiple ? "checkbox" : "radio"}
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                if (onSelect) onSelect();
                else onClick();
              }}
              onClick={(e) => e.stopPropagation()}
              tabIndex={-1}
              aria-label={l.ariaSelectEntry(entry.objectName)}
            />
          </span>
        )}
      </div>

      <span className="bunny-fm__entry-name" title={entry.objectName}>
        {entry.objectName}
      </span>

      {!entry.isDirectory && (
        <span className="bunny-fm__entry-meta">
          {formatBytes(entry.length)}
        </span>
      )}
      <span className="bunny-fm__entry-date">
        {formatDate(entry.lastChanged)}
      </span>

      {renderActions}
    </div>
  );
}

// ── Default per-entry actions ─────────────────────────────────

export function DefaultEntryActions({
  actions,
  executeAction,
  onDelete,
  locale: l = defaultLocale,
}: {
  actions: FileManagerAction[];
  executeAction: (actionId: string) => Promise<void>;
  onDelete?: () => void;
  locale?: BunnyUploadLocale;
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

  if (actions.length === 0 && !onDelete) return null;

  const [primary, ...rest] = actions;
  const hasOverflow = rest.length > 0 || !!onDelete;

  return (
    <div className="bunny-fm__entry-actions" onClick={(e) => e.stopPropagation()}>
      {primary && (
        <button
          type="button"
          className="bunny-fm__action-btn"
          onClick={() => executeAction(primary.id)}
        >
          {primary.label}
        </button>
      )}
      {hasOverflow && (
        <div className="bunny-fm__action-menu" ref={menuRef}>
          <button
            type="button"
            className="bunny-fm__action-btn bunny-fm__action-more"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={l.ariaMoreActions}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            &hellip;
          </button>
          {menuOpen && (
            <div className="bunny-fm__action-dropdown" role="menu">
              {rest.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  role="menuitem"
                  className="bunny-fm__action-dropdown-item"
                  onClick={() => {
                    executeAction(action.id);
                    setMenuOpen(false);
                  }}
                >
                  {action.label}
                </button>
              ))}
              {onDelete && (
                <button
                  type="button"
                  role="menuitem"
                  className="bunny-fm__action-dropdown-item bunny-fm__action-dropdown-item--danger"
                  onClick={() => {
                    onDelete();
                    setMenuOpen(false);
                  }}
                >
                  {l.delete}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── New folder placeholder entry ──────────────────────────────

export function NewFolderEntry({
  onCreate,
  locale: l = defaultLocale,
}: {
  onCreate: (name: string) => Promise<void>;
  locale?: BunnyUploadLocale;
}) {
  return (
    <div
      className="bunny-fm__entry bunny-fm__entry--new-folder"
      role="button"
      tabIndex={0}
      aria-label={l.ariaCreateNewFolder}
      onClick={() => {
        const name = prompt(l.folderNamePrompt);
        if (name?.trim()) onCreate(name.trim());
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const name = prompt(l.folderNamePrompt);
          if (name?.trim()) onCreate(name.trim());
        }
      }}
    >
      <div className="bunny-fm__entry-thumb">
        <span className="bunny-fm__entry-icon bunny-fm__entry-icon--add" />
      </div>
      <span className="bunny-fm__entry-name">{l.newFolder}</span>
    </div>
  );
}

// ── Upload file placeholder entry ─────────────────────────────

export function UploadFileEntry({
  endpoint,
  onUploaded,
  locale: l = defaultLocale,
}: {
  endpoint: string;
  onUploaded: () => void;
  locale?: BunnyUploadLocale;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const form = new FormData();
      for (const file of Array.from(files)) {
        form.append("file", file);
      }
      await fetch(endpoint, { method: "POST", body: form });
      onUploaded();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      className="bunny-fm__entry bunny-fm__entry--new-folder"
      role="button"
      tabIndex={0}
      aria-label={uploading ? l.uploadingFile : l.uploadFile}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <div className="bunny-fm__entry-thumb">
        <span className="bunny-fm__entry-icon bunny-fm__entry-icon--upload" />
      </div>
      <span className="bunny-fm__entry-name">
        {uploading ? l.uploadingFile : l.uploadFile}
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleChange}
        style={{ display: "none" }}
        aria-hidden="true"
      />
    </div>
  );
}
