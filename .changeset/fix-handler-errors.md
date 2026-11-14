---
"@bunny.net/upload-handler": patch
"@bunny.net/upload-core": patch
---

Return the right status when `authorize` rejects instead of an unhandled 500. Stop retrying 4xx upload responses, show the server's error message, and mark presigned uploads as failed when the completion request is rejected.
