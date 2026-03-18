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
  restrictions: {
    maxFileSize: "10mb",
    allowedTypes: ["image/*"],
    maxFiles: 5,
  },
  getPath: (file) => `/uploads/${Date.now()}-${file.name}`,
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
| `restrictions` | `HandlerRestrictions` | — | Server-side file validation |
| `getPath` | `(file, req) => string` | `/${file.name}` | Control where files are stored |
| `onBeforeUpload` | `(file, req) => void` | — | Validate before upload (throw to reject) |
| `onAfterUpload` | `(result, req) => void` | — | Run after successful upload |

### `getPath`

Controls where the file lands in your storage zone. The path becomes the key, and the CDN URL is `${cdnBase}${path}`.

```ts
// Flat with timestamp
getPath: (file) => `/uploads/${Date.now()}-${file.name}`

// Per-user folders
getPath: async (file, req) => {
  const session = await getSession(req);
  return `/users/${session.userId}/${file.name}`;
}

// By content type
getPath: (file) => `/${file.type.split("/")[0]}/${Date.now()}-${file.name}`
```

### `onBeforeUpload`

Validate the request before allowing uploads. Throw an `UploadError` to reject with a specific status code:

```ts
import { createBunnyUploadHandler, UploadError } from "@bunny.net/upload-handler";

createBunnyUploadHandler({
  onBeforeUpload: async (_file, req) => {
    const cookie = req.headers.get("cookie");
    const session = await getSession(cookie);
    if (!session) throw new UploadError("Unauthorized", 401);
  },
});
```

### Storage regions

```ts
import { regions } from "@bunny.net/upload-handler";

createBunnyUploadHandler({
  storageRegion: regions.StorageRegion.NewYork,
});
```

Available regions: `Falkenstein`, `NewYork`, `LosAngeles`, `Singapore`, `Sydney`, `London`, `Stockholm`, `SaoPaulo`, `Johannesburg`, `HongKong`, `Tokyo`, `Chicago`, `Madrid`.
