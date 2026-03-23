import { useState } from "react";
import { FileManager, formatBytes } from "@bunny.net/upload-react";

const IMAGE_RE = /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i;

export function App() {
  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 4 }}>{"<FileManager>"} Render Props</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        Full control over the UI — the component provides all state and methods via render props.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
        <GridBrowserExample />
        <ImageGalleryExample />
      </div>
    </div>
  );
}

function GridBrowserExample() {
  const [inserted, setInserted] = useState<string[]>([]);

  return (
    <Section title="Grid browser" description="A complete file browser with toolbar, breadcrumbs, grid thumbnails, selection, and action bar.">
      <FileManager>
        {({
          entries, currentPath, status, error, breadcrumbs, selected, selectedUrls,
          navigate, goUp, refresh, toggleSelect, deselectAll, entryUrl, deleteEntry, createFolder,
        }) => (
          <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#f9f9f9", borderBottom: "1px solid #e0e0e0", flexWrap: "wrap" }}>
              <button onClick={goUp} disabled={currentPath === "/"} style={toolBtn}>← Back</button>
              <button onClick={refresh} style={toolBtn}>Refresh</button>
              <button onClick={() => { const n = prompt("Folder name:"); if (n?.trim()) createFolder(n.trim()); }} style={toolBtn}>New Folder</button>

              <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: 8, fontSize: 13 }}>
                {breadcrumbs.map((c, i) => (
                  <span key={c.path}>
                    {i > 0 && <span style={{ color: "#999", margin: "0 2px" }}>/</span>}
                    <button onClick={() => navigate(c.path)} style={{ background: "none", border: "none", cursor: "pointer", color: c.path === currentPath ? "#333" : "#0066cc", fontWeight: c.path === currentPath ? 600 : 400, padding: "2px 4px", fontSize: 13 }}>
                      {c.label}
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: 16, minHeight: 240 }}>
              {status === "loading" && <Msg color="#888">Loading…</Msg>}
              {status === "error" && <Msg color="#c00">{error} <button onClick={refresh} style={toolBtn}>Retry</button></Msg>}
              {status === "idle" && entries.length === 0 && <Msg color="#999">No files found</Msg>}

              {status === "idle" && entries.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
                  {sorted(entries).map((entry) => {
                    const isSelected = selected.some((s) => s.guid === entry.guid);
                    const isImage = IMAGE_RE.test(entry.objectName);

                    return (
                      <div
                        key={entry.guid}
                        onClick={() => entry.isDirectory ? navigate(`${entry.path}${entry.objectName}/`) : toggleSelect(entry.guid)}
                        style={{ padding: 8, borderRadius: 6, border: `2px solid ${isSelected ? "#0066cc" : "transparent"}`, background: isSelected ? "#e3f2fd" : "#fff", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}
                      >
                        <div style={{ width: "100%", aspectRatio: "1", background: "#f0f0f0", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                          {entry.isDirectory ? <span style={{ fontSize: 36 }}>📁</span>
                            : isImage ? <img src={entryUrl(entry)} alt={entry.objectName} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                            : <span style={{ fontSize: 36 }}>📄</span>}
                        </div>
                        <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={entry.objectName}>{entry.objectName}</div>
                        {!entry.isDirectory && <div style={{ fontSize: 11, color: "#999" }}>{formatBytes(entry.length)}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selection bar */}
            {selected.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f0f6ff", borderTop: "1px solid #d0e0f0" }}>
                <span style={{ fontSize: 13 }}>
                  {selected.length} file(s) selected
                  <button onClick={deselectAll} style={{ background: "none", border: "none", color: "#0066cc", cursor: "pointer", marginLeft: 8, fontSize: 13 }}>Clear</button>
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => navigator.clipboard.writeText(selectedUrls.join("\n"))} style={toolBtn}>Copy URLs</button>
                  <button onClick={() => setInserted(selectedUrls)} style={{ ...toolBtn, background: "#0066cc", color: "#fff", borderColor: "#0066cc" }}>Insert selected</button>
                  <button onClick={async () => { if (!confirm(`Delete ${selected.length} item(s)?`)) return; for (const e of selected) await deleteEntry(e.isDirectory ? `${e.path}${e.objectName}/` : `${e.path}${e.objectName}`); }} style={{ ...toolBtn, color: "#c00", borderColor: "#c00" }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        )}
      </FileManager>

      {inserted.length > 0 && (
        <Result>
          <strong>Inserted URLs:</strong>
          <ul style={{ margin: "8px 0 0", padding: "0 0 0 20px" }}>
            {inserted.map((url) => <li key={url} style={{ wordBreak: "break-all", marginBottom: 4 }}>{url}</li>)}
          </ul>
        </Result>
      )}
    </Section>
  );
}

function ImageGalleryExample() {
  const [picked, setPicked] = useState<string[]>([]);

  return (
    <Section title="Image gallery picker" description="Filter to images and build a gallery-style picker with multi-select.">
      <FileManager>
        {({ entries, navigate, toggleSelect, selected, selectedUrls, entryUrl, breadcrumbs, currentPath, status }) => {
          const images = entries.filter((e) => e.isDirectory || IMAGE_RE.test(e.objectName));
          const dirs = images.filter((e) => e.isDirectory);
          const files = images.filter((e) => !e.isDirectory);

          return (
            <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
              {/* Breadcrumbs */}
              <div style={{ padding: "10px 16px", background: "#f9f9f9", borderBottom: "1px solid #e0e0e0", fontSize: 13 }}>
                {breadcrumbs.map((c, i) => (
                  <span key={c.path}>
                    {i > 0 && <span style={{ color: "#999", margin: "0 4px" }}>/</span>}
                    <button onClick={() => navigate(c.path)} style={{ background: "none", border: "none", cursor: "pointer", color: c.path === currentPath ? "#333" : "#0066cc", fontWeight: c.path === currentPath ? 600 : 400, padding: "2px 4px", fontSize: 13 }}>
                      {c.label}
                    </button>
                  </span>
                ))}
              </div>

              <div style={{ padding: 16, minHeight: 200 }}>
                {status === "loading" && <Msg color="#888">Loading…</Msg>}

                {dirs.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    {dirs.map((dir) => (
                      <button key={dir.guid} onClick={() => navigate(`${dir.path}${dir.objectName}/`)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: "1px solid #e0e0e0", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 13 }}>
                        📁 {dir.objectName}
                      </button>
                    ))}
                  </div>
                )}

                {status === "idle" && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                    {files.map((entry) => {
                      const isSelected = selected.some((s) => s.guid === entry.guid);
                      return (
                        <div key={entry.guid} onClick={() => toggleSelect(entry.guid)} style={{ borderRadius: 6, overflow: "hidden", border: `3px solid ${isSelected ? "#0066cc" : "transparent"}`, cursor: "pointer", transition: "border-color 0.15s" }}>
                          <img src={entryUrl(entry)} alt={entry.objectName} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} loading="lazy" />
                        </div>
                      );
                    })}
                  </div>
                )}

                {status === "idle" && files.length === 0 && dirs.length === 0 && <Msg color="#999">No images found</Msg>}
              </div>

              {selected.length > 0 && (
                <div style={{ padding: "12px 16px", borderTop: "1px solid #e0e0e0", fontSize: 13, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {selected.map((s) => (
                    <img key={s.guid} src={entryUrl(s)} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                  ))}
                  <span style={{ color: "#666", marginLeft: 4 }}>{selected.length} selected</span>
                  <button onClick={() => setPicked(selectedUrls)} style={{ marginLeft: "auto", padding: "4px 12px", border: "1px solid #0066cc", borderRadius: 4, background: "#0066cc", color: "#fff", cursor: "pointer", fontSize: 12 }}>
                    Use selected
                  </button>
                </div>
              )}
            </div>
          );
        }}
      </FileManager>

      {picked.length > 0 && (
        <Result>
          <strong>Picked URLs:</strong>
          <ul style={{ margin: "8px 0 0", padding: "0 0 0 20px" }}>
            {picked.map((url) => <li key={url} style={{ wordBreak: "break-all", marginBottom: 4 }}>{url}</li>)}
          </ul>
        </Result>
      )}
    </Section>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function sorted<T extends { isDirectory: boolean; objectName: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.objectName.localeCompare(b.objectName);
  });
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: 4 }}>{title}</h3>
      <p style={{ color: "#666", fontSize: 14, marginBottom: 12 }}>{description}</p>
      {children}
    </section>
  );
}

function Result({ children }: { children: React.ReactNode }) {
  return <div style={{ marginTop: 12, padding: 12, background: "#f9f9f9", borderRadius: 6, fontSize: 13 }}>{children}</div>;
}

function Msg({ color, children }: { color: string; children: React.ReactNode }) {
  return <div style={{ textAlign: "center", padding: 40, color }}>{children}</div>;
}

const toolBtn: React.CSSProperties = {
  padding: "5px 12px", border: "1px solid #ccc", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 12,
};
