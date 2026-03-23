import { useState } from "react";
import { useFileManager, formatBytes } from "@bunny.net/upload-react";

export function App() {
  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 4 }}>useFileManager Hook</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        Maximum control — just state and methods, zero UI from us.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
        <TableBrowserExample />
        <ImagePickerExample />
      </div>
    </div>
  );
}

function TableBrowserExample() {
  const fm = useFileManager();

  const sorted = [...fm.entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.objectName.localeCompare(b.objectName);
  });

  return (
    <Section title="Table browser" description="Full file browser with navigation, CRUD, bulk selection, and inline actions — all wired up with the hook.">
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => fm.goUp()} disabled={fm.currentPath === "/"} style={btnStyle}>← Back</button>
        <button onClick={() => fm.refresh()} style={btnStyle}>Refresh</button>
        <button onClick={() => { const n = prompt("Folder name:"); if (n?.trim()) fm.createFolder(n.trim()); }} style={btnStyle}>New Folder</button>
        <button onClick={async () => { const u = prompt("URL to import:"); if (!u?.trim()) return; const f = prompt("Filename (blank for auto):") || undefined; await fm.importFromUrl(u.trim(), f?.trim()); }} style={btnStyle}>Import URL</button>

        {fm.selected.length > 0 && (
          <>
            <span style={{ marginLeft: "auto", fontSize: 13, color: "#666" }}>{fm.selected.length} selected</span>
            <button onClick={async () => { if (confirm(`Delete ${fm.selected.length} item(s)?`)) await fm.deleteSelected(); }} style={{ ...btnStyle, color: "#c00", borderColor: "#c00" }}>Delete Selected</button>
          </>
        )}
      </div>

      {/* Breadcrumbs */}
      <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 14, marginBottom: 12 }}>
        {fm.breadcrumbs.map((c, i) => (
          <span key={c.path}>
            {i > 0 && <span style={{ color: "#999", margin: "0 4px" }}>/</span>}
            <button onClick={() => fm.navigate(c.path)} style={{ background: "none", border: "none", cursor: "pointer", color: c.path === fm.currentPath ? "#333" : "#0066cc", fontWeight: c.path === fm.currentPath ? 600 : 400, padding: "2px 4px", fontSize: 14 }}>
              {c.label}
            </button>
          </span>
        ))}
      </div>

      {/* Status */}
      {fm.status === "loading" && <Msg color="#888">Loading…</Msg>}
      {fm.status === "error" && <Msg color="#c00">Error: {fm.error} <button onClick={() => fm.refresh()} style={{ ...btnStyle, marginLeft: 8 }}>Retry</button></Msg>}
      {fm.status === "idle" && fm.entries.length === 0 && <Msg color="#999">This folder is empty</Msg>}

      {/* Table */}
      {fm.status === "idle" && sorted.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>
                <input type="checkbox" checked={fm.selected.length === fm.entries.length && fm.entries.length > 0} onChange={(e) => (e.target.checked ? fm.selectAll() : fm.deselectAll())} />
              </th>
              <th style={thStyle}>Name</th>
              <th style={{ ...thStyle, width: 100 }}>Size</th>
              <th style={{ ...thStyle, width: 160 }}>Modified</th>
              <th style={{ ...thStyle, width: 140 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => {
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
                        <a href="#" onClick={(e) => { e.preventDefault(); fm.navigate(fullPath); }} style={{ color: "#0066cc", textDecoration: "none" }}>{entry.objectName}</a>
                      ) : (
                        <span>{entry.objectName}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: "#888", fontSize: 13 }}>{entry.isDirectory ? "—" : formatBytes(entry.length)}</td>
                  <td style={{ ...tdStyle, color: "#888", fontSize: 13 }}>
                    {new Date(entry.lastChanged).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td style={tdStyle}>
                    {!entry.isDirectory && (
                      <>
                        <button onClick={() => window.open(fm.downloadUrl(fullPath), "_blank")} style={linkBtn}>Download</button>
                        <button onClick={() => navigator.clipboard.writeText(fm.cdnUrl(fullPath))} style={linkBtn}>Copy URL</button>
                      </>
                    )}
                    <button onClick={async () => { const p = entry.isDirectory ? fullPath + "/" : fullPath; if (confirm(`Delete "${entry.objectName}"?`)) await fm.deleteEntry(p); }} style={{ ...linkBtn, color: "#c00" }}>Delete</button>
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

function ImagePickerExample() {
  const [result, setResult] = useState<string[]>([]);
  const fm = useFileManager();

  const imageEntries = fm.entries.filter(
    (e) => e.isDirectory || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(e.objectName)
  );

  const sorted = [...imageEntries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.objectName.localeCompare(b.objectName);
  });

  const selectedUrls = fm.selected
    .filter((e) => !e.isDirectory)
    .map((e) => fm.cdnUrl(`${e.path}${e.objectName}`));

  return (
    <Section title="Image picker" description="Build a compact image picker that feeds selected URLs back to a parent component.">
      <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
        {/* Breadcrumbs */}
        <div style={{ padding: "8px 16px", background: "#f9f9f9", borderBottom: "1px solid #e0e0e0", fontSize: 13 }}>
          {fm.breadcrumbs.map((c, i) => (
            <span key={c.path}>
              {i > 0 && <span style={{ color: "#999", margin: "0 4px" }}>/</span>}
              <button onClick={() => fm.navigate(c.path)} style={{ background: "none", border: "none", cursor: "pointer", color: c.path === fm.currentPath ? "#333" : "#0066cc", fontWeight: c.path === fm.currentPath ? 600 : 400, padding: "2px 4px", fontSize: 13 }}>
                {c.label}
              </button>
            </span>
          ))}
        </div>

        <div style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 8, minHeight: 120 }}>
          {fm.status === "loading" && <Msg color="#888">Loading…</Msg>}
          {sorted.map((entry) => {
            if (entry.isDirectory) {
              return (
                <button key={entry.guid} onClick={() => fm.navigate(`${entry.path}${entry.objectName}/`)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", border: "1px solid #e0e0e0", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 12 }}>
                  📁 {entry.objectName}
                </button>
              );
            }

            const isSelected = fm.selected.some((s) => s.guid === entry.guid);
            return (
              <div key={entry.guid} onClick={() => fm.toggleSelect(entry.guid)} style={{ width: 80, cursor: "pointer", borderRadius: 4, border: `2px solid ${isSelected ? "#0066cc" : "transparent"}`, overflow: "hidden" }}>
                <img src={fm.cdnUrl(`${entry.path}${entry.objectName}`)} alt={entry.objectName} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} loading="lazy" />
              </div>
            );
          })}
        </div>

        {fm.selected.length > 0 && (
          <div style={{ padding: "10px 16px", borderTop: "1px solid #e0e0e0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13 }}>{fm.selected.length} selected</span>
            <button onClick={() => { setResult(selectedUrls); fm.deselectAll(); }} style={{ ...btnStyle, background: "#0066cc", color: "#fff", borderColor: "#0066cc" }}>
              Confirm selection
            </button>
          </div>
        )}
      </div>

      {result.length > 0 && (
        <Result>
          <strong>Confirmed URLs:</strong>
          <ul style={{ margin: "8px 0 0", padding: "0 0 0 20px" }}>
            {result.map((url) => <li key={url} style={{ wordBreak: "break-all", marginBottom: 4 }}>{url}</li>)}
          </ul>
        </Result>
      )}
    </Section>
  );
}

// ── Shared UI ──────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section>
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

const btnStyle: React.CSSProperties = {
  padding: "6px 14px", border: "1px solid #ccc", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #eee", fontSize: 12, textTransform: "uppercase", color: "#888", fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px", borderBottom: "1px solid #f0f0f0", fontSize: 14,
};

const linkBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#0066cc", padding: "2px 6px",
};
