# @bunny.net/upload-handler

Server-side upload handler for [bunny-upload](../../README.md). Proxies uploads from the browser to Bunny Storage using [`@bunny.net/storage-sdk`](https://github.com/BunnyWay/edge-script-sdk).

## Install

```bash
npm install @bunny.net/upload-handler
```

## Environment variables

The handler reads credentials from environment variables automatically:

```env
BUNNY_STORAGE_ZONE=my-zone
BUNNY_STORAGE_PASSWORD=my-password
BUNNY_CDN_BASE=https://my-zone.b-cdn.net
BUNNY_STORAGE_REGION=de              # optional, defaults to Falkenstein (de)
```

## Usage

```ts
import { createBunnyUploadHandler } from "@bunny.net/upload-handler";

const handler = createBunnyUploadHandler({
  authorize: async ({ request, file }) => true,
  path: ({ file }) => `/uploads/${Date.now()}-${file.name}`,
  onComplete: async ({ file }) => {
    // file is the UploadResult — { name, path, size, url }
  },
  restrictions: {
    maxFileSize: "10mb",
    allowedTypes: ["image/*"],
    maxFiles: 5,
  },
});

// handler is (request: Request) => Promise<Response>
// Use it with any framework that supports standard Request/Response
```

For framework-specific wrappers, see [`@bunny.net/upload-next`](../next) and [`@bunny.net/upload-nuxt`](../nuxt).

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `storageZone` | `string` | `BUNNY_STORAGE_ZONE` env var | Bunny Storage zone name |
| `storagePassword` | `string` | `BUNNY_STORAGE_PASSWORD` env var | Storage zone password |
| `cdnBase` | `string` | `BUNNY_CDN_BASE` env var | CDN base URL for generating file URLs |
| `storageRegion` | `StorageRegion` | `Falkenstein` | Storage region |
| `restrictions` | `Restrictions` | — | Server-side file validation |
| `authorize` | `({ request, file }) => boolean \| void` | — | Allow or deny an upload. Return `false` (or throw `UploadError`) to reject. |
| `path` | `({ file, request }) => string` | `/${file.name}` | Control where files are stored. |
| `onComplete` | `({ file, request }) => void` | — | Run after a successful upload. `file` is the `UploadResult`. |

### `path`

Controls where the file lands in your storage zone. The path becomes the key, and the CDN URL is `${cdnBase}${path}`.

```ts
// Flat with timestamp
path: ({ file }) => `/uploads/${Date.now()}-${file.name}`

// Per-user folders
path: async ({ file, request }) => {
  const session = await getSession(request);
  return `/users/${session.userId}/${file.name}`;
}

// By content type
path: ({ file }) => `/${file.type.split("/")[0]}/${Date.now()}-${file.name}`
```

### `authorize`

Allow or deny an upload before it starts. Return `false` to reject with a 403, or throw an `UploadError` for a specific status code:

```ts
import { createBunnyUploadHandler, UploadError } from "@bunny.net/upload-handler";

createBunnyUploadHandler({
  authorize: async ({ request }) => {
    const session = await getSession(request.headers.get("cookie"));
    if (!session) throw new UploadError("Unauthorized", 401);
    return true;
  },
});
```

### Deprecated aliases

The previous hook names still work and map to the new ones:

| Deprecated | Use instead |
|---|---|
| `onBeforeUpload(file, req)` | `authorize({ request, file })` |
| `getPath(file, req)` | `path({ file, request })` |
| `onAfterUpload(result, req)` | `onComplete({ file, request })` |

### Storage regions

```ts
import { regions } from "@bunny.net/upload-handler";

createBunnyUploadHandler({
  storageRegion: regions.StorageRegion.NewYork,
});
```

Available regions: `Falkenstein`, `NewYork`, `LosAngeles`, `Singapore`, `Sydney`, `London`, `Stockholm`, `SaoPaulo`, `Johannesburg`, `HongKong`, `Tokyo`, `Chicago`, `Madrid`.
