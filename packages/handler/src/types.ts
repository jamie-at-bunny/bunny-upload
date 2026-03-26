export type {
  Restrictions,
  UploadResult,
  PresignResult,
  PresignResponse,
} from "@bunny.net/upload-shared";
export { HandlerError } from "@bunny.net/upload-shared";

import { HandlerError } from "@bunny.net/upload-shared";
import type { Restrictions, UploadResult } from "@bunny.net/upload-shared";

/** @deprecated Use `Restrictions` from `@bunny.net/upload-shared` instead. */
export type HandlerRestrictions = Restrictions;

export interface FileInfo {
  name: string;
  size: number;
  type: string;
}

export interface PresignRequest {
  presign: true;
  files: FileInfo[];
}

export interface CompleteRequest {
  complete: true;
  files: { name: string; path: string; size: number }[];
}

import type { regions } from "@bunny.net/storage-sdk";

export interface HandlerOptions {
  storageZone?: string;
  storagePassword?: string;
  cdnBase?: string;
  storageRegion?: regions.StorageRegion;
  restrictions?: Restrictions;
  onBeforeUpload?: (file: FileInfo, req: Request) => Promise<void> | void;
  getPath?: (file: FileInfo, req: Request) => string;
  onAfterUpload?: (result: UploadResult, req: Request) => Promise<void> | void;
}

export interface HandlerResponse {
  files: UploadResult[];
}

export class UploadError extends HandlerError {}
