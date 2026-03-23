import { useState } from "react";
import { FileManagerWidget } from "@bunny.net/upload-react";
import { copyUrlAction, downloadAction } from "@bunny.net/file-manager-core/actions";

export function App() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 4 }}>FileManagerWidget</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        A ready-to-use dialog with grid view, breadcrumbs, and file selection.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
        <InstantSelectExample />
        <PreselectionExample />
        <MultiSelectExample />
        <CustomFooterActionsExample />
        <PerEntryActionsExample />
        <RegisteredActionsExample />
        <ImagePickerExample />
      </div>
    </div>
  );
}

function InstantSelectExample() {
  const [picked, setPicked] = useState<{ name: string; url: string } | null>(null);

  return (
    <Section title="Instant single select" description="With allowMultiple={false} and onSelect, clicking a file immediately fires the callback and closes the dialog.">
      <FileManagerWidget
        label="Pick a file"
        allowMultiple={false}
        onSelect={(entries, urls) => setPicked({ name: entries[0].objectName, url: urls[0] })}
        trigger={({ open }) => <button onClick={open} style={btnStyle}>Pick a file</button>}
      />
      {picked && (
        <Result>
          <strong>{picked.name}</strong>
          <div style={{ color: "#666", wordBreak: "break-all", marginTop: 4 }}>{picked.url}</div>
        </Result>
      )}
    </Section>
  );
}

function PreselectionExample() {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  return (
    <Section title="Preselection with value" description="Pass value to pre-check files when the dialog opens. Reopen after selecting — your picks are restored.">
      <FileManagerWidget
        label="Pick files"
        value={selectedPaths}
        onSelect={(entries) => setSelectedPaths(entries.map((e) => e.path + e.objectName))}
        trigger={({ open }) => <button onClick={open} style={btnStyle}>Pick files (with preselection)</button>}
      />
      {selectedPaths.length > 0 && (
        <Result>
          <strong>Selected paths ({selectedPaths.length}):</strong>
          <ul style={{ margin: "8px 0 0", padding: "0 0 0 20px" }}>
            {selectedPaths.map((p) => <li key={p} style={{ marginBottom: 4 }}>{p}</li>)}
          </ul>
          <button onClick={() => setSelectedPaths([])} style={{ ...btnStyle, marginTop: 8, fontSize: 12 }}>Clear</button>
        </Result>
      )}
    </Section>
  );
}

function MultiSelectExample() {
  const [pickedUrls, setPickedUrls] = useState<string[]>([]);

  return (
    <Section title="Multi-select" description="Select multiple files and confirm. The callback receives all selected entries and URLs.">
      <FileManagerWidget
        label="Browse files"
        onSelect={(_entries, urls) => setPickedUrls(urls)}
        trigger={({ open }) => <button onClick={open} style={btnStyle}>Pick files</button>}
      />
      {pickedUrls.length > 0 && (
        <Result>
          <strong>Selected URLs:</strong>
          <ul style={{ margin: "8px 0 0", padding: "0 0 0 20px" }}>
            {pickedUrls.map((url) => <li key={url} style={{ wordBreak: "break-all", marginBottom: 4 }}>{url}</li>)}
          </ul>
        </Result>
      )}
    </Section>
  );
}

function CustomFooterActionsExample() {
  const [lastAction, setLastAction] = useState<string | null>(null);

  return (
    <Section title="Custom footer actions" description="Use renderActions to provide your own buttons in the footer when files are selected.">
      <FileManagerWidget
        label="Browse files"
        allowMultiple={false}
        renderActions={({ selected, urls, deselectAll }) => (
          <>
            <button onClick={() => { navigator.clipboard.writeText(urls[0]); setLastAction(`Copied: ${urls[0]}`); deselectAll(); }} style={{ ...btnStyle, background: "#0066cc", color: "#fff" }}>Copy URL</button>
            <button onClick={() => { window.open(urls[0], "_blank"); setLastAction(`Opened: ${selected[0].objectName}`); }} style={btnStyle}>Open in new tab</button>
          </>
        )}
        trigger={({ open }) => <button onClick={open} style={btnStyle}>Browse (footer actions)</button>}
      />
      {lastAction && <Result>{lastAction}</Result>}
    </Section>
  );
}

function PerEntryActionsExample() {
  const [lastAction, setLastAction] = useState<string | null>(null);

  return (
    <Section title="Per-entry actions" description="Use renderEntryActions to add action buttons on each item in the grid. Useful for download, copy, delete per file.">
      <FileManagerWidget
        label="Browse files"
        renderEntryActions={({ entry, url }) => (
          <>
            <button
              onClick={() => { navigator.clipboard.writeText(url); setLastAction(`Copied URL for ${entry.objectName}`); }}
              style={actionBtnStyle}
            >
              Copy
            </button>
            {!entry.isDirectory && (
              <button
                onClick={() => { window.open(url, "_blank"); setLastAction(`Opened ${entry.objectName}`); }}
                style={actionBtnStyle}
              >
                Open
              </button>
            )}
          </>
        )}
        trigger={({ open }) => <button onClick={open} style={btnStyle}>Browse (per-entry actions)</button>}
      />
      {lastAction && <Result>{lastAction}</Result>}
    </Section>
  );
}

function RegisteredActionsExample() {
  const [lastAction, setLastAction] = useState<string | null>(null);

  return (
    <Section
      title="Registered actions"
      description="Register actions via the actions prop. They automatically appear on entries (via renderEntryActions) and in the footer (via renderActions) based on their target setting."
    >
      <FileManagerWidget
        label="Browse files"
        actions={[copyUrlAction, downloadAction]}
        renderEntryActions={({ actions, executeAction }) => (
          <>
            {actions.map((a) => (
              <button
                key={a.id}
                onClick={() => { executeAction(a.id).then(() => setLastAction(`${a.label} executed`)); }}
                style={actionBtnStyle}
              >
                {a.label}
              </button>
            ))}
          </>
        )}
        renderActions={({ selected, actions, executeAction }) => (
          <>
            <span style={{ fontSize: 12, color: "#666" }}>{selected.length} selected — </span>
            {actions.map((a) => (
              <button
                key={a.id}
                onClick={() => executeAction(a.id).then(() => setLastAction(`${a.label} on ${selected.length} file(s)`))}
                style={btnStyle}
              >
                {a.label}
              </button>
            ))}
          </>
        )}
        trigger={({ open }) => <button onClick={open} style={btnStyle}>Browse (registered actions)</button>}
      />
      {lastAction && <Result>{lastAction}</Result>}
    </Section>
  );
}

function ImagePickerExample() {
  const [image, setImage] = useState<{ url: string; name: string } | null>(null);

  return (
    <Section title="Image picker" description="Filter by file extension with accept. Single select with allowMultiple={false}.">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <FileManagerWidget
          label="Pick image"
          accept={["jpg", "jpeg", "png", "gif", "webp", "svg"]}
          allowMultiple={false}
          onSelect={(entries, urls) => setImage({ url: urls[0], name: entries[0].objectName })}
          trigger={({ open }) => <button onClick={open} style={btnStyle}>Choose image</button>}
        />
        {image && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={image.url} alt={image.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4, border: "1px solid #e0e0e0" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{image.name}</div>
              <div style={{ fontSize: 11, color: "#888", wordBreak: "break-all" }}>{image.url}</div>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

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

const btnStyle: React.CSSProperties = {
  padding: "8px 16px", border: "1px solid #ccc", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 13,
};

const actionBtnStyle: React.CSSProperties = {
  padding: "2px 8px", border: "1px solid #ddd", borderRadius: 3, background: "#fff", cursor: "pointer", fontSize: 11,
};
