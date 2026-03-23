# @bunny.net/upload-react

React hooks and drop-in component for [bunny-upload](../../README.md).

## Install

```bash
npm install @bunny.net/upload-react @bunny.net/upload-handler @bunny.net/upload-next
```

## Drop-in component

```tsx
"use client";

import { BunnyUpload } from "@bunny.net/upload-react";

export default function Page() {
  return (
    <BunnyUpload
      accept={["image/*"]}
      maxSize="10mb"
      maxFiles={5}
      onComplete={(files) => console.log("Uploaded:", files)}
    />
  );
}
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | `"/.bunny/upload"` | Server upload endpoint |
| `accept` | `string[]` | — | Allowed MIME types (e.g. `["image/*"]`) |
| `maxSize` | `string \| number` | — | Max file size (e.g. `"10mb"`) |
| `maxFiles` | `number` | — | Max number of files |
| `autoUpload` | `boolean` | `true` | Upload immediately when files are added |
| `onComplete` | `(files: UploadResult[]) => void` | — | Called when all uploads finish |
| `onError` | `(error: Error, file?: FileState) => void` | — | Called when an upload fails |
| `className` | `string` | — | CSS class for the container |

## Headless hook

For full control over the UI:

```tsx
"use client";

import { useBunnyUpload } from "@bunny.net/upload-react";

export default function CustomUploader() {
  const { files, addFiles, removeFile, upload, reset, isUploading } = useBunnyUpload({
    accept: ["image/*"],
    maxSize: "10mb",
    maxFiles: 5,
    onComplete: (results) => console.log(results),
  });

  return (
    <div>
      <input type="file" multiple onChange={(e) => addFiles(e.target.files!)} />
      {files.map((file) => (
        <div key={file.id}>
          {file.name} — {file.status} ({file.progress}%)
          <button onClick={() => removeFile(file.id)}>Remove</button>
        </div>
      ))}
      <button onClick={upload} disabled={isUploading}>Upload</button>
    </div>
  );
}
```

## Shared defaults

Use `configureBunnyUpload` to set defaults across your app without React context:

```tsx
import { configureBunnyUpload } from "@bunny.net/upload-react";

const { BunnyUpload, useBunnyUpload } = configureBunnyUpload({
  accept: ["image/*"],
  maxSize: "10mb",
  maxFiles: 5,
});

// Use these pre-configured versions anywhere
export { BunnyUpload, useBunnyUpload };
```

## File Manager

Browse, select, and manage files in your Bunny Storage zone. Three levels of control — just like uploads.

### FileManagerWidget

A ready-to-use dialog with grid view, breadcrumbs, and selection.

```tsx
"use client";

import { FileManagerWidget } from "@bunny.net/upload-react";

// Multi-select: pick files, confirm, get URLs
<FileManagerWidget
  accept={["jpg", "png", "webp"]}
  onSelect={(entries, urls) => console.log("Selected:", urls)}
  trigger={({ open }) => <button onClick={open}>Pick images</button>}
/>

// Single select: click a file and it's immediately selected — no confirm step
<FileManagerWidget
  allowMultiple={false}
  onSelect={(entries, urls) => setImage(urls[0])}
  trigger={({ open }) => <button onClick={open}>Pick image</button>}
/>

// Pre-select previously chosen files when the dialog reopens
const [selected, setSelected] = useState<string[]>([]);

<FileManagerWidget
  value={selected}
  onSelect={(entries, urls) => {
    setSelected(entries.map(e => e.path + e.objectName));
  }}
/>

// Custom footer actions when files are selected
<FileManagerWidget
  allowMultiple={false}
  renderActions={({ selected, urls, actions, executeAction }) => (
    <>
      <button onClick={() => navigator.clipboard.writeText(urls[0])}>Copy URL</button>
      <button onClick={() => insertImage(urls[0])}>Insert</button>
      {/* Or render registered actions dynamically */}
      {actions.map(a => (
        <button key={a.id} onClick={() => executeAction(a.id)}>{a.label}</button>
      ))}
    </>
  )}
/>

// Per-entry actions on each item in the grid/list
import { copyUrlAction, downloadAction } from "@bunny.net/file-manager-core/actions";

<FileManagerWidget
  actions={[copyUrlAction, downloadAction]}
  renderEntryActions={({ entry, url, actions, executeAction }) => (
    <>
      {actions.map(a => (
        <button key={a.id} onClick={() => executeAction(a.id)}>{a.label}</button>
      ))}
    </>
  )}
/>
```

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | `"/.bunny/files"` | Server file manager endpoint |
| `cdnBase` | `string` | — | CDN base URL (auto-detected from server if not set) |
| `initialPath` | `string` | `"/"` | Starting directory |
| `actions` | `FileManagerAction[]` | — | Custom actions registered on the file manager |
| `allowMultiple` | `boolean` | `true` | Allow selecting multiple files. When `false` with `onSelect`, clicking a file immediately fires the callback and closes the dialog. |
| `accept` | `string[]` | — | Filter by file extension (e.g. `["jpg", "png"]`) |
| `value` | `string[]` | — | Pre-select entries matching these paths (`entry.path + entry.objectName`). When the dialog opens, matching files appear checked. |
| `onSelect` | `(entries, urls) => void` | — | Called when user confirms selection (or immediately on click when `allowMultiple={false}`) |
| `renderEntryActions` | `(props) => ReactNode` | — | Custom actions rendered on each entry in the grid/list |
| `renderActions` | `(props) => ReactNode` | — | Custom actions in the footer when files are selected |
| `trigger` | `(props: { open }) => ReactNode` | — | Custom trigger element |
| `label` | `string` | `"Browse files"` | Label for default trigger button |
| `view` | `"grid" \| "list"` | `"grid"` | View mode |

The `renderEntryActions` callback receives `{ entry: StorageEntry, url: string, actions: FileManagerAction[], executeAction: (id) => Promise<void> }`. The `actions` array is filtered to those applicable for that single entry (respects `target` and `isApplicable`).

The `renderActions` callback receives `{ selected: StorageEntry[], urls: string[], actions: FileManagerAction[], executeAction: (id) => Promise<void>, deselectAll: () => void }`. The `actions` array is filtered for the current selection count.

When `allowMultiple={false}` is combined with `renderActions` (instead of `onSelect`), the instant-select behavior is disabled — the user clicks to select, then uses your custom action buttons.

### FileManager (render props)

Full control over the UI. The component provides all state and methods via render props.

```tsx
"use client";

import { FileManager } from "@bunny.net/upload-react";

<FileManager>
  {({ entries, selected, selectedUrls, navigate, toggleSelect, entryUrl, breadcrumbs, cdnUrl }) => (
    <div>
      {breadcrumbs.map((c) => (
        <button key={c.path} onClick={() => navigate(c.path)}>{c.label}</button>
      ))}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
        {entries.map(entry => (
          <div
            key={entry.guid}
            onClick={() =>
              entry.isDirectory
                ? navigate(entry.path + entry.objectName + "/")
                : toggleSelect(entry.guid)
            }
          >
            {!entry.isDirectory && /\.(jpg|png|webp)$/i.test(entry.objectName) && (
              <img src={entryUrl(entry)} alt={entry.objectName} />
            )}
            <span>{entry.objectName}</span>
          </div>
        ))}
      </div>

      {selected.length > 0 && (
        <button onClick={() => console.log(selectedUrls)}>
          Use {selected.length} file(s)
        </button>
      )}
    </div>
  )}
</FileManager>
```

#### Render props

| Prop | Type | Description |
|---|---|---|
| `entries` | `StorageEntry[]` | Files and folders in current directory |
| `currentPath` | `string` | Current directory path |
| `status` | `"idle" \| "loading" \| "error"` | Loading state |
| `error` | `string` | Error message when status is `"error"` |
| `selected` | `StorageEntry[]` | Currently selected entries |
| `selectedUrls` | `string[]` | CDN URLs for selected files |
| `breadcrumbs` | `{ label, path }[]` | Navigation breadcrumbs |
| `navigate` | `(path: string) => void` | Navigate to a directory |
| `goUp` | `() => void` | Go to parent directory |
| `refresh` | `() => void` | Refresh current directory |
| `toggleSelect` | `(guid: string) => void` | Toggle selection |
| `selectAll` / `deselectAll` | `() => void` | Select/deselect all |
| `entryUrl` | `(entry) => string` | Get CDN URL for an entry |
| `cdnUrl` | `(path: string) => string` | Get CDN URL for a path |
| `createFolder` | `(name: string) => void` | Create a folder |
| `deleteEntry` | `(path: string) => void` | Delete a file or folder |
| `importFromUrl` | `(url, filename?) => void` | Import file from URL |

### useFileManager (hook)

Maximum control — just state and methods, zero UI.

```tsx
"use client";

import { useFileManager } from "@bunny.net/upload-react";

export default function CustomFileBrowser() {
  const {
    entries, currentPath, status, error, selected, breadcrumbs,
    navigate, goUp, refresh, toggleSelect, selectAll, deselectAll,
    createFolder, deleteEntry, deleteSelected, importFromUrl,
    cdnUrl, downloadUrl, getActions, executeAction,
  } = useFileManager({
    endpoint: "/.bunny/files",
    initialPath: "/",
  });

  return (
    <div>
      <button onClick={goUp} disabled={currentPath === "/"}>Back</button>
      <button onClick={refresh}>Refresh</button>

      {entries.map(entry => (
        <div key={entry.guid}>
          <input
            type="checkbox"
            checked={selected.some(s => s.guid === entry.guid)}
            onChange={() => toggleSelect(entry.guid)}
          />
          {entry.isDirectory ? (
            <a onClick={() => navigate(entry.path + entry.objectName + "/")}>
              {entry.objectName}/
            </a>
          ) : (
            <span>{entry.objectName}</span>
          )}
        </div>
      ))}

      {selected.length > 0 && (
        <button onClick={deleteSelected}>
          Delete {selected.length} file(s)
        </button>
      )}
    </div>
  );
}
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | `"/.bunny/files"` | Server file manager endpoint |
| `cdnBase` | `string` | — | CDN base URL |
| `initialPath` | `string` | `"/"` | Starting directory |
| `actions` | `FileManagerAction[]` | — | Custom actions |

## Server setup

You'll need a server route to handle uploads. See the [handler docs](../handler) for full options.

```ts
// app/.bunny/upload/route.ts
import { serveBunnyUpload } from "@bunny.net/upload-next";
import { createBunnyUploadHandler } from "@bunny.net/upload-handler";

export const { POST } = serveBunnyUpload(
  createBunnyUploadHandler({
    restrictions: { maxFileSize: "10mb", allowedTypes: ["image/*"], maxFiles: 5 },
    getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
  })
);
```

### File manager handler

```ts
// app/.bunny/files/route.ts
import { serveBunnyFileManager } from "@bunny.net/upload-next";
import { createFileManagerHandler } from "@bunny.net/file-manager-handler";

export const { GET, POST, DELETE } = serveBunnyFileManager(
  createFileManagerHandler()
);
```
