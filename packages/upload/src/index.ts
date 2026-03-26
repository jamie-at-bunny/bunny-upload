// Server — handler for proxying uploads to Bunny Storage
export {
  createBunnyUploadHandler,
  UploadError,
  regions,
} from "@bunny.net/upload-handler";

export type {
  HandlerOptions,
  HandlerRestrictions,
  HandlerResponse,
  FileInfo,
  PresignRequest,
  PresignResult as HandlerPresignResult,
  PresignResponse as HandlerPresignResponse,
  CompleteRequest,
} from "@bunny.net/upload-handler";

// Client — upload engine, dropzone, and utilities
export {
  Uploader,
  createUploader,
  createDropzone,
  DEFAULT_ENDPOINT,
  parseFileSize,
  matchesMimeType,
  formatBytes,
} from "@bunny.net/upload-core";

// Locale / i18n
export { defaultLocale, resolveLocale } from "@bunny.net/upload-shared";
export type { BunnyUploadLocale } from "@bunny.net/upload-shared";

export type {
  FileState,
  FileStatus,
  UploadResult,
  UploadResponse,
  PresignResult,
  PresignResponse,
  Restrictions,
  UploaderOptions,
  UploaderEvent,
  EventMap,
  DropzoneOptions,
  Dropzone,
} from "@bunny.net/upload-core";
