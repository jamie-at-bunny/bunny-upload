# @bunny.net/file-manager-core

Framework-agnostic file manager engine for [Bunny Storage](https://bunny.net/storage). Handles navigation, selection, CRUD operations, and custom actions.

This is the core library — for React, see [`@bunny.net/upload-react`](../react). For the server handler, see [`@bunny.net/file-manager-handler`](../file-manager-handler).

## Install

```bash
npm install @bunny.net/file-manager-core
```

## Usage

```ts
import { createFileManager } from "@bunny.net/file-manager-core";

const fm = createFileManager({
  endpoint: "/.bunny/files",
  initialPath: "/",
});

// Navigate and list files
await fm.navigate("/images");
const state = fm.getState();
console.log(state.entries); // StorageEntry[]

// Selection
fm.toggleSelect(state.entries[0].guid);
fm.selectAll();
const selected = fm.getSelected();

// CRUD
await fm.createFolder("photos");
await fm.deleteEntry("/images/old.jpg");
await fm.importFromUrl("https://example.com/photo.jpg");

// URLs
fm.cdnUrl("/images/photo.jpg");  // https://my-zone.b-cdn.net/images/photo.jpg
fm.downloadUrl("/images/photo.jpg"); // /.bunny/files?path=%2Fimages%2Fphoto.jpg&download=true

// Clean up
fm.destroy();
```

## API

### `createFileManager(options?)`

Creates a new `FileManager` instance.

| Option | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | `"/.bunny/files"` | Server handler endpoint |
| `cdnBase` | `string` | — | CDN base URL (auto-detected from server if not set) |
| `initialPath` | `string` | `"/"` | Starting directory path |
| `actions` | `FileManagerAction[]` | — | Custom actions to register |

### Navigation

| Method | Description |
|---|---|
| `navigate(path)` | Navigate to a directory and fetch its entries |
| `goUp()` | Navigate to parent directory |
| `refresh()` | Reload current directory |
| `getBreadcrumbs()` | Get breadcrumb trail as `{ label, path }[]` |

### Selection

| Method | Description |
|---|---|
| `select(guid)` | Select an entry |
| `deselect(guid)` | Deselect an entry |
| `toggleSelect(guid)` | Toggle an entry's selection |
| `selectAll()` | Select all entries |
| `deselectAll()` | Deselect all entries |
| `getSelected()` | Get selected `StorageEntry[]` |

### CRUD

| Method | Description |
|---|---|
| `createFolder(name)` | Create a folder in the current directory |
| `deleteEntry(path)` | Delete a file or directory |
| `deleteSelected()` | Delete all selected entries |
| `importFromUrl(url, filename?)` | Import a file from URL into the current directory |
| `cdnUrl(path)` | Get the public CDN URL for a path |
| `downloadUrl(path)` | Get the download URL for a path |

### Custom Actions

Register actions that operate on selected files:

```ts
import { copyUrlAction, downloadAction } from "@bunny.net/file-manager-core/actions";

const fm = createFileManager({
  actions: [copyUrlAction, downloadAction],
});

// Or register later
fm.registerAction({
  id: "insert-image",
  label: "Insert Image",
  target: "single", // "single" | "multi" | "both"
  isApplicable: (entries) => /\.(jpg|png|webp)$/i.test(entries[0].objectName),
  handler: (entries, { fileManager }) => {
    const url = fileManager.cdnUrl(entries[0].path + entries[0].objectName);
    editor.insertImage(url);
  },
});

// Get applicable actions for current selection
const actions = fm.getActions();
await fm.executeAction("insert-image");
```

| Method | Description |
|---|---|
| `registerAction(action)` | Register a custom action |
| `unregisterAction(id)` | Remove a registered action |
| `getActions(entries?)` | Get actions applicable to the given (or selected) entries |
| `executeAction(id, entries?)` | Execute an action |

### State & Events

```ts
// Get current state
const state = fm.getState();
// { currentPath, entries, selected, status, error }

// Subscribe to state changes (for framework integrations)
const unsub = fm.subscribe(() => {
  console.log(fm.getState());
});

// Listen to specific events
fm.on("navigate", (path) => console.log("Navigated to:", path));
fm.on("selection-change", (selected) => console.log("Selected:", selected));
fm.on("entries-loaded", (entries) => console.log("Loaded:", entries.length));
fm.on("error", (error) => console.error(error));
fm.on("action-start", (id, entries) => console.log("Action started:", id));
fm.on("action-complete", (id, entries) => console.log("Action done:", id));
fm.on("import-start", (url, path) => console.log("Importing:", url));
fm.on("import-complete", (url, path) => console.log("Imported:", url));
```

### Built-in Actions

Import from `@bunny.net/file-manager-core/actions`:

| Action | Description |
|---|---|
| `copyUrlAction` | Copies the CDN URL to clipboard (single file) |
| `downloadAction` | Opens the download URL in a new tab (single file) |

## Types

### StorageEntry

`StorageEntry` is the JSON-serialized subset of `@bunny.net/storage-sdk`'s `StorageFile` type. The server handler converts SDK responses into this shape before sending them to the client. If you're already using the storage SDK, this is the same data — just with dates as ISO strings instead of `Date` objects, and without server-only fields like `userId`, `storageZoneId`, and `data()`.

`@bunny.net/file-manager-core` is the canonical source for this type — both the handler and React packages re-export it from here.

```ts
import type { StorageEntry } from "@bunny.net/file-manager-core";

interface StorageEntry {
  guid: string;
  objectName: string;
  path: string;
  isDirectory: boolean;
  length: number;
  contentType: string;
  lastChanged: string;   // ISO 8601 (serialized from SDK's Date)
  dateCreated: string;   // ISO 8601 (serialized from SDK's Date)
  checksum: string | null;
}
```

### Other types

```ts
type FileManagerStatus = "idle" | "loading" | "error";

interface FileManagerAction {
  id: string;
  label: string;
  icon?: string;
  target: "single" | "multi" | "both";
  isApplicable?: (entries: StorageEntry[]) => boolean;
  handler: (entries: StorageEntry[], context: ActionContext) => Promise<void> | void;
}
```
