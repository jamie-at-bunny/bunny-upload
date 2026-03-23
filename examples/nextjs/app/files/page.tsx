"use client";

import { useState } from "react";
import {
  useFileManager,
  FileManager,
  FileManagerWidget,
  formatBytes,
  type StorageEntry,
} from "@bunny.net/upload-react";
import { copyUrlAction, downloadAction } from "@bunny.net/file-manager-core/actions";

export default function FilesPage() {
  const [mode, setMode] = useState<"widget" | "render-props" | "hook">("widget");

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif" }}>
      <a href="/" style={{ color: "#0066cc", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 16 }}>
        &larr; Back to uploads
      </a>
      <h1 style={{ marginBottom: 8 }}>Bunny File Manager</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Three ways to use the file manager — from zero-config widget to fully custom hook.
      </p>

      {/* Mode switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        {(["widget", "render-props", "hook"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "8px 16px",
              border: "1px solid #ccc",
              borderRadius: 4,
              background: mode === m ? "#0066cc" : "#fff",
              color: mode === m ? "#fff" : "#333",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: mode === m ? 600 : 400,
            }}
          >
            {m === "widget" ? "Widget" : m === "render-props" ? "Render Props" : "Hook"}
          </button>
        ))}
      </div>

      {mode === "widget" && <WidgetExample />}
      {mode === "render-props" && <RenderPropsExample />}
      {mode === "hook" && <HookExample />}
    </main>
  );
}

// ── 1. Widget ──────────────────────────────────────────────────
// Zero-config — opens a dialog, pick files, get URLs back.

function WidgetExample() {
  const [pickedUrls, setPickedUrls] = useState<string[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  return (
    <Section
      title="FileManagerWidget"
      description="A ready-to-use dialog with grid view, breadcrumbs, and selection. Pass onSelect or renderActions to control what happens."
    >
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        {/* Instant single select: click a file → fires immediately */}
        <FileManagerWidget
          label="Pick one image"
          accept={["jpg", "jpeg", "png", "gif", "webp", "svg"]}
          allowMultiple={false}
          onSelect={(entries, urls) => setPickedUrls(urls)}
          trigger={({ open }) => (
            <button onClick={open} style={btnStyle}>
              Pick image (instant)
            </button>
          )}
        />

        {/* Multi-select with preselection via value */}
        <FileManagerWidget
          label="Pick files"
          value={selectedPaths}
          onSelect={(entries, urls) => {
            setSelectedPaths(entries.map((e) => e.path + e.objectName));
            setPickedUrls(urls);
          }}
          trigger={({ open }) => (
            <button onClick={open} style={btnStyle}>
              Pick files (with preselection)
            </button>
          )}
        />

        {/* Registered actions: per-entry + footer */}
        <FileManagerWidget
          label="Browse files"
          actions={[copyUrlAction, downloadAction]}
          renderEntryActions={({ actions, executeAction }) => (
            <>
              {actions.map((a) => (
                <button
                  key={a.id}
                  onClick={() => executeAction(a.id)}
                  style={{ padding: "2px 8px", border: "1px solid #ddd", borderRadius: 3, background: "#fff", cursor: "pointer", fontSize: 11 }}
                >
                  {a.label}
                </button>
              ))}
            </>
          )}
          renderActions={({ selected, urls, actions, executeAction }) => (
            <>
              {actions.map((a) => (
                <button key={a.id} onClick={() => executeAction(a.id)} style={btnStyle}>
                  {a.label}
                </button>
              ))}
            </>
          )}
          trigger={({ open }) => (
            <button onClick={open} style={btnStyle}>
              Browse (with actions)
            </button>
          )}
        />
      </div>

      {pickedUrls.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <strong>Selected URLs:</strong>
          <ul style={{ margin: "8px 0", padding: "0 0 0 20px" }}>
            {pickedUrls.map((url) => (
              <li key={url} style={{ fontSize: 13, wordBreak: "break-all", marginBottom: 4 }}>{url}</li>
            ))}
          </ul>
        </div>
      )}

      {selectedPaths.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <strong>Tracked paths (for preselection):</strong>
          <ul style={{ margin: "8px 0", padding: "0 0 0 20px" }}>
            {selectedPaths.map((p) => (
              <li key={p} style={{ fontSize: 13, marginBottom: 4 }}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

// ── 2. Render Props ────────────────────────────────────────────
// Full control over the UI, but the FileManager component manages
// the hook lifecycle for you.

function RenderPropsExample() {
  const [inserted, setInserted] = useState<string[]>([]);

  return (
    <Section
      title="<FileManager> (render props)"
      description="Build your own UI — the component provides all state and methods via render props."
    >
      <FileManager>
        {({ entries, currentPath, status, breadcrumbs, selected, selectedUrls, navigate, toggleSelect, goUp, entryUrl }) => (
          <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
            {/* Breadcrumbs */}
            <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "12px 16px", background: "#f9f9f9", borderBottom: "1px solid #e0e0e0", fontSize: 14, flexWrap: "wrap" }}>
              {breadcrumbs.map((c, i) => (
                <span key={c.path}>
                  {i > 0 && <span style={{ color: "#999", margin: "0 4px" }}>/</span>}
                  <button
                    onClick={() => navigate(c.path)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: c.path === currentPath ? "#333" : "#0066cc",
                      fontWeight: c.path === currentPath ? 600 : 400,
                      padding: "2px 4px",
                      fontSize: 14,
                    }}
                  >
                    {c.label}
                  </button>
                </span>
              ))}
            </div>

            {/* Grid */}
            <div style={{ padding: 16, minHeight: 200 }}>
              {status === "loading" && <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading…</div>}
              {status === "idle" && entries.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Empty folder</div>}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
                {entries
                  .sort((a, b) => {
                    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
                    return a.objectName.localeCompare(b.objectName);
                  })
                  .map((entry) => {
                    const isSelected = selected.some((s) => s.guid === entry.guid);
                    const isImage = !entry.isDirectory && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(entry.objectName);

                    return (
                      <div
                        key={entry.guid}
                        onClick={() =>
                          entry.isDirectory
                            ? navigate(`${entry.path}${entry.objectName}/`)
                            : toggleSelect(entry.guid)
                        }
                        style={{
                          padding: 8,
                          borderRadius: 6,
                          border: `2px solid ${isSelected ? "#0066cc" : "transparent"}`,
                          background: isSelected ? "#e3f2fd" : "#fff",
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ width: "100%", aspectRatio: "1", background: "#f0f0f0", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                          {entry.isDirectory ? (
                            <span style={{ fontSize: 36 }}>📁</span>
                          ) : isImage ? (
                            <img src={entryUrl(entry)} alt={entry.objectName} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                          ) : (
                            <span style={{ fontSize: 36 }}>📄</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={entry.objectName}>
                          {entry.objectName}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Selection bar */}
            {selected.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f0f6ff", borderTop: "1px solid #d0e0f0" }}>
                <span style={{ fontSize: 13 }}>{selected.length} file(s) selected</span>
                <button
                  onClick={() => {
                    setInserted(selectedUrls);
                  }}
                  style={{ ...btnStyle, background: "#0066cc", color: "#fff" }}
                >
                  Insert selected
                </button>
              </div>
            )}
          </div>
        )}
      </FileManager>

      {inserted.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <strong>Inserted:</strong>
          <ul style={{ margin: "8px 0", padding: "0 0 0 20px" }}>
            {inserted.map((url) => (
              <li key={url} style={{ fontSize: 13, wordBreak: "break-all", marginBottom: 4 }}>{url}</li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

// ── 3. Hook ────────────────────────────────────────────────────
// Maximum control — just the state and methods, build everything yourself.

function HookExample() {
  const fm = useFileManager();

  return (
    <Section
      title="useFileManager (hook)"
      description="Maximum control — all state and methods, zero UI from us."
    >
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => fm.goUp()} disabled={fm.currentPath === "/"} style={btnStyle}>
          ← Back
        </button>
        <button onClick={() => fm.refresh()} style={btnStyle}>Refresh</button>
        <button
          onClick={() => {
            const name = prompt("Folder name:");
            if (name?.trim()) fm.createFolder(name.trim());
          }}
          style={btnStyle}
        >
          New Folder
        </button>
        {fm.selected.length > 0 && (
          <>
            <span style={{ marginLeft: "auto", fontSize: 13, color: "#666" }}>{fm.selected.length} selected</span>
            <button
              onClick={async () => {
                if (confirm(`Delete ${fm.selected.length} item(s)?`)) {
                  await fm.deleteSelected();
                }
              }}
              style={{ ...btnStyle, color: "#c00", borderColor: "#c00" }}
            >
              Delete
            </button>
          </>
        )}
      </div>

      {/* Breadcrumbs */}
      <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 14, marginBottom: 16 }}>
        {fm.breadcrumbs.map((c, i) => (
          <span key={c.path}>
            {i > 0 && <span style={{ color: "#999", margin: "0 4px" }}>/</span>}
            <button
              onClick={() => fm.navigate(c.path)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: c.path === fm.currentPath ? "#333" : "#0066cc",
                fontWeight: c.path === fm.currentPath ? 600 : 400,
                padding: "2px 4px",
                fontSize: 14,
              }}
            >
              {c.label}
            </button>
          </span>
        ))}
      </div>

      {/* Table */}
      {fm.status === "loading" && <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading…</div>}
      {fm.status === "error" && <div style={{ textAlign: "center", padding: 40, color: "#c00" }}>Error: {fm.error}</div>}
      {fm.status === "idle" && fm.entries.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Empty folder</div>}
      {fm.status === "idle" && fm.entries.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>
                <input
                  type="checkbox"
                  checked={fm.selected.length === fm.entries.length && fm.entries.length > 0}
                  onChange={(e) => (e.target.checked ? fm.selectAll() : fm.deselectAll())}
                />
              </th>
              <th style={thStyle}>Name</th>
              <th style={{ ...thStyle, width: 100 }}>Size</th>
              <th style={{ ...thStyle, width: 160 }}>Modified</th>
              <th style={{ ...thStyle, width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...fm.entries]
              .sort((a, b) => {
                if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
                return a.objectName.localeCompare(b.objectName);
              })
              .map((entry) => {
                const isSelected = fm.selected.some((s) => s.guid === entry.guid);
                const fullPath = `${entry.path}${entry.objectName}`;

                return (
                  <tr key={entry.guid} style={{ background: isSelected ? "#f0f6ff" : undefined }}>
                    <td style={tdStyle}>
                      <input type="checkbox" checked={isSelected} onChange={() => fm.toggleSelect(entry.guid)} />
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{entry.isDirectory ? "📁" : "📄"}</span>
                        {entry.isDirectory ? (
                          <a href="#" onClick={(e) => { e.preventDefault(); fm.navigate(fullPath); }} style={{ color: "#0066cc", textDecoration: "none" }}>
                            {entry.objectName}
                          </a>
                        ) : (
                          <span>{entry.objectName}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: "#888", fontSize: 13 }}>
                      {entry.isDirectory ? "—" : formatBytes(entry.length)}
                    </td>
                    <td style={{ ...tdStyle, color: "#888", fontSize: 13 }}>
                      {new Date(entry.lastChanged).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>
                    <td style={tdStyle}>
                      {!entry.isDirectory && (
                        <>
                          <button onClick={() => window.open(fm.downloadUrl(fullPath), "_blank")} style={linkBtnStyle}>Download</button>
                          <button onClick={() => navigator.clipboard.writeText(fm.cdnUrl(fullPath))} style={linkBtnStyle}>Copy URL</button>
                        </>
                      )}
                      <button
                        onClick={async () => {
                          const p = entry.isDirectory ? fullPath + "/" : fullPath;
                          if (confirm(`Delete "${entry.objectName}"?`)) await fm.deleteEntry(p);
                        }}
                        style={{ ...linkBtnStyle, color: "#c00" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      )}
    </Section>
  );
}

// ── Shared UI helpers ──────────────────────────────────────────

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ marginBottom: 4 }}>{title}</h2>
      <p style={{ color: "#666", marginBottom: 16 }}>{description}</p>
      {children}
    </section>
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

const linkBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  color: "#0066cc",
  padding: "2px 6px",
};
