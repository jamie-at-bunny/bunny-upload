# @bunny.net/upload

The main package for [bunny-upload](../../README.md) — re-exports everything from both the client engine ([`@bunny.net/upload-core`](../core)) and the server handler ([`@bunny.net/upload-handler`](../handler)).

## Install

```bash
npm install @bunny.net/upload
```

One install gives you everything you need for both client and server.

## Server exports

```ts
import {
  createBunnyUploadHandler,
  UploadError,
  regions,
} from "@bunny.net/upload";
```

See the [handler docs](../handler) for full configuration options.

## Client exports

```ts
import {
  createUploader,
  createDropzone,
  formatBytes,
} from "@bunny.net/upload";
```

See the [core docs](../core) for all client utilities.

## Framework packages

Pair `@bunny.net/upload` with a framework package for your UI:

| Framework | Package | Install |
|---|---|---|
| React / Next.js | `@bunny.net/upload-react` | `npm install @bunny.net/upload @bunny.net/upload-react` |
| Vue / Nuxt | `@bunny.net/upload-vue` | `npm install @bunny.net/upload @bunny.net/upload-vue` |
| SolidJS / SolidStart | `@bunny.net/upload-solid` | `npm install @bunny.net/upload @bunny.net/upload-solid` |
| Angular | `@bunny.net/upload-angular` | `npm install @bunny.net/upload @bunny.net/upload-angular` |
| Vanilla JS | — | `npm install @bunny.net/upload` (use `createDropzone` directly) |
