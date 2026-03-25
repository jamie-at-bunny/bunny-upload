import React, { useEffect, useRef, useState } from "react";
import type { StorageEntry, FileManagerAction } from "@bunny.net/file-manager-core";

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

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
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
}: {
  breadcrumbs: { label: string; path: string }[];
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <nav className="bunny-fm__breadcrumbs" aria-label="File navigation">
      {breadcrumbs.map((crumb, i) => (
        <React.Fragment key={crumb.path}>
          {i > 0 && <span className="bunny-fm__breadcrumb-sep">/</span>}
          <button
            type="button"
            className={`bunny-fm__breadcrumb${
              crumb.path === currentPath ? " bunny-fm__breadcrumb--active" : ""
            }`}
            onClick={() => onNavigate(crumb.path)}
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
}: {
  status: string;
  error?: string;
  isEmpty: boolean;
  onRetry: () => void;
}) {
  if (status === "loading") {
    return <div className="bunny-fm__loading">Loading…</div>;
  }
  if (status === "error") {
    return (
      <div className="bunny-fm__error">
        {error}
        <button type="button" className="bunny-fm__retry" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }
  if (status === "idle" && isEmpty) {
    return <div className="bunny-fm__empty">No files found</div>;
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
            />
          </span>
        )}
      </div>

      <span className="bunny-fm__entry-name" title={entry.objectName}>
        {entry.objectName}
      </span>

      {!entry.isDirectory && (
        <span className="bunny-fm__entry-meta">
          {formatFileSize(entry.length)}
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
}: {
  actions: FileManagerAction[];
  executeAction: (actionId: string) => Promise<void>;
  onDelete?: () => void;
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
              {onDelete && (
                <button
                  type="button"
                  className="bunny-fm__action-dropdown-item bunny-fm__action-dropdown-item--danger"
                  onClick={() => {
                    onDelete();
                    setMenuOpen(false);
                  }}
                >
                  Delete
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
}: {
  onCreate: (name: string) => Promise<void>;
}) {
  return (
    <div
      className="bunny-fm__entry bunny-fm__entry--new-folder"
      role="button"
      tabIndex={0}
      onClick={() => {
        const name = prompt("Folder name:");
        if (name?.trim()) onCreate(name.trim());
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const name = prompt("Folder name:");
          if (name?.trim()) onCreate(name.trim());
        }
      }}
    >
      <div className="bunny-fm__entry-thumb">
        <span className="bunny-fm__entry-icon bunny-fm__entry-icon--add" />
      </div>
      <span className="bunny-fm__entry-name">New folder</span>
    </div>
  );
}

// ── Upload file placeholder entry ─────────────────────────────

export function UploadFileEntry({
  endpoint,
  onUploaded,
}: {
  endpoint: string;
  onUploaded: () => void;
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
        {uploading ? "Uploading…" : "Upload file"}
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
