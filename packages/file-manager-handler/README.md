# @bunny.net/file-manager-handler

Server-side handler for browsing, creating, deleting, and importing files in [Bunny Storage](https://bunny.net/storage). Works with any framework that supports standard `Request`/`Response`.

For the client-side engine, see [`@bunny.net/file-manager-core`](../file-manager-core). For React components, see [`@bunny.net/upload-react`](../react).

## Install

```bash
npm install @bunny.net/file-manager-handler
```

## Environment variables

```env
BUNNY_STORAGE_ZONE=my-zone
BUNNY_STORAGE_PASSWORD=my-password
BUNNY_CDN_BASE=https://my-zone.b-cdn.net
BUNNY_STORAGE_REGION=de          # optional, defaults to Falkenstein
```

## Setup

### Next.js

```ts
// app/.bunny/files/route.ts
import { serveBunnyFileManager } from "@bunny.net/upload-next";
import { createFileManagerHandler } from "@bunny.net/file-manager-handler";

export const { GET, POST, DELETE } = serveBunnyFileManager(
  createFileManagerHandler()
);
```

### Hono

```ts
import { Hono } from "hono";
import { createFileManagerHandler } from "@bunny.net/file-manager-handler";

const app = new Hono();
const handler = createFileManagerHandler();

app.all("/.bunny/files", (c) => handler(c.req.raw));
```

### React Router / Remix

```ts
// app/routes/files.ts
import { createFileManagerHandler } from "@bunny.net/file-manager-handler";

const handler = createFileManagerHandler();

export async function loader({ request }: { request: Request }) {
  return handler(request);
}

export async function action({ request }: { request: Request }) {
  return handler(request);
}
```

### SolidStart

```ts
// src/routes/.bunny/files.ts
import type { APIEvent } from "@solidjs/start/server";
import { createFileManagerHandler } from "@bunny.net/file-manager-handler";

const handler = createFileManagerHandler();

export async function GET(event: APIEvent) {
  return handler(event.request);
}
export async function POST(event: APIEvent) {
  return handler(event.request);
}
export async function DELETE(event: APIEvent) {
  return handler(event.request);
}
```

## API

### `createFileManagerHandler(options?)`

Returns an async `(request: Request) => Promise<Response>` handler.

| Option | Type | Default | Description |
|---|---|---|---|
| `storageZone` | `string` | `BUNNY_STORAGE_ZONE` | Storage zone name |
| `storagePassword` | `string` | `BUNNY_STORAGE_PASSWORD` | Storage zone password |
| `cdnBase` | `string` | `BUNNY_CDN_BASE` | CDN base URL |
| `storageRegion` | `regions.StorageRegion` | `Falkenstein` | Storage region (re-exported from `@bunny.net/storage-sdk`) |

### Lifecycle hooks

All hooks receive the relevant path and the original `Request`. Throw a `FileManagerError` to return an error response.

| Hook | Signature | Description |
|---|---|---|
| `onBeforeList` | `(path, req) => void` | Before listing a directory |
| `onBeforeDelete` | `(path, req) => void` | Before deleting a file or folder |
| `onBeforeCreateFolder` | `(path, req) => void` | Before creating a folder |
| `onBeforeDownload` | `(path, req) => void` | Before downloading a file |
| `onBeforeImport` | `(url, path, req) => void` | Before importing a file from URL |

```ts
import { createFileManagerHandler, FileManagerError } from "@bunny.net/file-manager-handler";

const handler = createFileManagerHandler({
  onBeforeList: async (path, req) => {
    const session = await getSession(req.headers.get("cookie"));
    if (!session) throw new FileManagerError("Unauthorized", 401);
  },
  onBeforeDelete: async (path, req) => {
    if (path.startsWith("/protected/")) {
      throw new FileManagerError("Cannot delete protected files", 403);
    }
  },
});
```

## HTTP endpoints

The handler responds to all methods on a single route:

| Method | Query / Body | Description |
|---|---|---|
| `GET` | `?path=/dir/` | List directory contents |
| `GET` | `?path=/file.jpg&download=true` | Download a file |
| `POST` | `{ path: "/dir/new-folder/" }` | Create a folder |
| `DELETE` | `?path=/file.jpg` | Delete a file (trailing `/` for directories) |
| `PUT` | `{ url: "https://...", path: "/dest.jpg" }` | Import file from URL |

### Response format

**List directory:**

The handler converts `@bunny.net/storage-sdk`'s `StorageFile` objects into [`StorageEntry`](../file-manager-core) objects — the same type used by the client-side file manager. Dates are serialized to ISO 8601 strings and server-only fields are stripped.

```json
{
  "path": "/images/",
  "entries": [
    {
      "guid": "abc-123",
      "objectName": "photo.jpg",
      "path": "/images/",
      "isDirectory": false,
      "length": 204800,
      "contentType": "image/jpeg",
      "lastChanged": "2024-01-15T10:30:00.000Z",
      "dateCreated": "2024-01-15T10:30:00.000Z",
      "checksum": "abc123..."
    }
  ],
  "cdnBase": "https://my-zone.b-cdn.net"
}
```

See [`@bunny.net/file-manager-core`](../file-manager-core#storageentry) for the full `StorageEntry` type definition.
