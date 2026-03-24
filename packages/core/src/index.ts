import { Uploader } from "./uploader";
import type { UploaderOptions } from "./types";

export { Uploader };
export { createDropzone } from "./dropzone";
export type { DropzoneOptions, Dropzone } from "./dropzone";
export { DEFAULT_ENDPOINT } from "./types";
export { parseFileSize, matchesMimeType, formatBytes } from "./utils";
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
} from "./types";

export function createUploader(options: UploaderOptions = {}): Uploader {
  return new Uploader(options);
}
