"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useCallback } from "react";
import { createFileManager } from "@bunny.net/file-manager-core";
import { createUploader } from "@bunny.net/upload-core";
import type { StorageEntry } from "@bunny.net/file-manager-core";
import type { FileState } from "@bunny.net/upload-core";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function FilesPage() {
  const fmRef = useRef(createFileManager());
  const fm = fmRef.current;

  const state = useSyncExternalStore(
    useCallback((cb: () => void) => fm.subscribe(cb), [fm]),
    () => fm.getState(),
    () => fm.getState()
  );

  useEffect(() => {
    fm.navigate("/");
    return () => fm.destroy();
  }, [fm]);

  const breadcrumbs = fm.getBreadcrumbs();

  const sorted = [...state.entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.objectName.localeCompare(b.objectName);
  });

  const selectedCount = state.selected.size;

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif" }}>
      <a href="/" style={{ color: "#0066cc", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 16 }}>
        &larr; Back to uploads
      </a>
      <h1 style={{ marginBottom: 8 }}>Bunny File Manager</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>Browse, create folders, and manage files in your Bunny Storage zone.</p>

      {/* Breadcrumbs */}
      <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "8px 0", fontSize: 14, marginBottom: 16 }}>
        {breadcrumbs.map((c, i) => (
          <span key={c.path}>
            {i > 0 && <span style={{ color: "#999", margin: "0 4px" }}>/</span>}
            {i === breadcrumbs.length - 1 ? (
              <span style={{ color: "#333", fontWeight: 600 }}>{c.label}</span>
            ) : (
              <a href="#" onClick={(e) => { e.preventDefault(); fm.navigate(c.path); }} style={{ color: "#0066cc", textDecoration: "none" }}>
                {c.label}
              </a>
            )}
          </span>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <UploadFilesButton currentPath={state.currentPath} onUploadComplete={() => fm.refresh()} />
        <ImportUrlButton fm={fm} />
        <NewFolderButton onCreate={(name) => fm.createFolder(name)} />
        <button onClick={() => fm.refresh()} style={btnStyle}>Refresh</button>
        {selectedCount > 0 && (
          <>
            <span style={{ marginLeft: "auto", fontSize: 13, color: "#666" }}>{selectedCount} selected</span>
            <button
              onClick={async () => {
                if (confirm(`Delete ${selectedCount} item(s)?`)) {
                  await fm.deleteSelected();
                }
              }}
              style={{ ...btnStyle, color: "#c00", borderColor: "#c00" }}
            >
              Delete Selected
            </button>
          </>
        )}
      </div>

      {/* Upload progress */}
      <UploadProgress />

      {/* Content */}
      {state.status === "loading" && <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading...</div>}
      {state.status === "error" && <div style={{ textAlign: "center", padding: 40, color: "#c00" }}>Error: {state.error}</div>}
      {state.status === "idle" && state.entries.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>This folder is empty</div>
      )}
      {state.status === "idle" && sorted.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>
                <input
                  type="checkbox"
                  checked={selectedCount === state.entries.length && state.entries.length > 0}
                  onChange={(e) => e.target.checked ? fm.selectAll() : fm.deselectAll()}
                />
              </th>
              <th style={thStyle}>Name</th>
              <th style={{ ...thStyle, width: 100 }}>Size</th>
              <th style={{ ...thStyle, width: 160 }}>Modified</th>
              <th style={{ ...thStyle, width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <FileRow key={entry.guid} entry={entry} fm={fm} selected={state.selected.has(entry.guid)} />
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

// Shared upload state so progress renders outside the buttons
let uploadFilesState: FileState[] = [];
let uploadProgressListeners = new Set<() => void>();

function notifyUploadProgress() {
  uploadProgressListeners.forEach((fn) => fn());
}

function UploadProgress() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    uploadProgressListeners.add(listener);
    return () => { uploadProgressListeners.delete(listener); };
  }, []);

  if (uploadFilesState.length === 0) return null;

  return (
    <ul style={{ listStyle: "none", marginBottom: 16, padding: 0 }}>
      {uploadFilesState.map((f) => (
        <li key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", borderBottom: "1px solid #eee", fontSize: 13 }}>
          <span>
            <span style={{ fontWeight: 500 }}>{f.name}</span>
            <span style={{ color: "#888", marginLeft: 8 }}>{formatBytes(f.size)}</span>
          </span>
          {f.status === "uploading" && (
            <div style={{ width: 80, height: 4, background: "#eee", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#f60", width: `${f.progress}%`, transition: "width 0.2s" }} />
            </div>
          )}
          {f.status === "complete" && <span style={{ color: "#0a0" }}>&#x2713;</span>}
          {f.status === "error" && <span style={{ color: "#c00" }}>{f.error}</span>}
        </li>
      ))}
    </ul>
  );
}

function useUploader(currentPath: string, onUploadComplete: () => void) {
  const uploaderRef = useRef<ReturnType<typeof createUploader> | null>(null);

  const getUploader = useCallback(() => {
    const endpoint = `/.bunny/upload?folder=${encodeURIComponent(currentPath)}`;
    const uploader = createUploader({ endpoint });

    uploader.on("state-change", (files) => {
      uploadFilesState = [...files];
      notifyUploadProgress();
    });

    uploader.on("complete", () => {
      setTimeout(() => {
        onUploadComplete();
        setTimeout(() => {
          uploader.reset();
        }, 2000);
      }, 500);
    });

    uploaderRef.current = uploader;
    return uploader;
  }, [currentPath, onUploadComplete]);

  return getUploader;
}

function UploadFilesButton({ currentPath, onUploadComplete }: { currentPath: string; onUploadComplete: () => void }) {
  const getUploader = useUploader(currentPath, onUploadComplete);

  return (
    <label style={{ ...btnStyle, display: "inline-flex", alignItems: "center" }}>
      Upload Files
      <input
        type="file"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) {
            const u = getUploader();
            u.addFiles(e.target.files);
            u.upload();
            e.target.value = "";
          }
        }}
        style={{ display: "none" }}
      />
    </label>
  );
}

function FileRow({ entry, fm, selected }: { entry: StorageEntry; fm: ReturnType<typeof createFileManager>; selected: boolean }) {
  const fullPath = entry.path + entry.objectName;

  return (
    <tr style={{ background: selected ? "#f0f6ff" : undefined }}>
      <td style={tdStyle}>
        <input type="checkbox" checked={selected} onChange={() => fm.toggleSelect(entry.guid)} />
      </td>
      <td style={tdStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{entry.isDirectory ? "\uD83D\uDCC1" : "\uD83D\uDCC4"}</span>
          {entry.isDirectory ? (
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); fm.navigate(fullPath); }}
              style={{ color: "#0066cc", textDecoration: "none" }}
            >
              {entry.objectName}
            </a>
          ) : (
            <span>{entry.objectName}</span>
          )}
        </div>
      </td>
      <td style={{ ...tdStyle, color: "#888", fontSize: 13 }}>{entry.isDirectory ? "\u2014" : formatBytes(entry.length)}</td>
      <td style={{ ...tdStyle, color: "#888", fontSize: 13 }}>
        {new Date(entry.lastChanged).toLocaleDateString(undefined, {
          month: "short", day: "numeric", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })}
      </td>
      <td style={tdStyle}>
        {!entry.isDirectory && (
          <>
            <button onClick={() => window.open(fm.downloadUrl(fullPath), "_blank")} style={actionBtnStyle}>Download</button>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(fm.cdnUrl(fullPath));
              }}
              style={actionBtnStyle}
            >
              Copy URL
            </button>
          </>
        )}
        <button
          onClick={async () => {
            const deletePath = entry.isDirectory ? fullPath + "/" : fullPath;
            if (confirm(`Delete "${entry.objectName}"?`)) {
              await fm.deleteEntry(deletePath);
            }
          }}
          style={{ ...actionBtnStyle, color: "#c00" }}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

function ImportUrlButton({ fm }: { fm: ReturnType<typeof createFileManager> }) {
  return (
    <button
      onClick={async () => {
        const url = prompt("URL to import:");
        if (!url?.trim()) return;
        const filename = prompt("Filename (leave empty to auto-detect):") || undefined;
        try {
          await fm.importFromUrl(url.trim(), filename?.trim());
        } catch (err) {
          alert("Import failed: " + (err instanceof Error ? err.message : err));
        }
      }}
      style={btnStyle}
    >
      Import URL
    </button>
  );
}

function NewFolderButton({ onCreate }: { onCreate: (name: string) => void }) {
  return (
    <button
      onClick={() => {
        const value = prompt("Folder name:");
        if (value?.trim()) onCreate(value.trim());
      }}
      style={btnStyle}
    >
      New Folder
    </button>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "6px 14px",
  border: "1px solid #ccc",
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: "2px solid #eee",
  fontSize: 12,
  textTransform: "uppercase",
  color: "#888",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #f0f0f0",
  fontSize: 14,
};

const actionBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  color: "#0066cc",
  padding: "2px 6px",
};
