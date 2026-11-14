---
"@bunny.net/upload": minor
---

Rebuild `@bunny.net/upload` as a standalone package with `/server`, `/client` and `/react` entry points. The server handler is dependency-free apart from Zod, supports proxy and presigned uploads behind one client protocol, signs upload tokens, rejects path traversal, and streams proxy uploads with an exact byte count. The package no longer re-exports `@bunny.net/upload-core` or `@bunny.net/upload-handler`.
