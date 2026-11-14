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
  files: { name: string; path: string; size: number; token: string }[];
}

import type { regions } from "@bunny.net/storage-sdk";

export interface UploadAuthorizeContext {
  request: Request;
  file: FileInfo;
}

export interface UploadPathContext {
  file: FileInfo;
  request: Request;
}

export interface UploadCompleteContext {
  file: UploadResult;
  request: Request;
}

export interface HandlerOptions {
  storageZone?: string;
  storagePassword?: string;
  cdnBase?: string;
  storageRegion?: regions.StorageRegion;
  endpointUrl?: string;
  restrictions?: Restrictions;

  authorize?: (
    ctx: UploadAuthorizeContext
  ) => Promise<boolean | void> | boolean | void;
  path?: (ctx: UploadPathContext) => string;
  onComplete?: (ctx: UploadCompleteContext) => Promise<void> | void;

  /**
   * How long the presign-completion token is valid for, in seconds.
   * Defaults to 3600 (1 hour) to match the presigned URL expiry.
   */
  tokenExpirySeconds?: number;

  /**
   * Whether the complete step should HEAD the uploaded object in Bunny
   * Storage to confirm it actually exists before firing `onComplete`.
   * Defaults to `true`. Set to `false` to skip the HEAD round-trip if
   * you trust the signed token alone.
   */
  verifyUploadOnComplete?: boolean;

  /** @deprecated Use `authorize` instead. Return `false` to deny, or throw an `UploadError`. */
  onBeforeUpload?: (file: FileInfo, req: Request) => Promise<void> | void;
  /** @deprecated Use `path` instead. */
  getPath?: (file: FileInfo, req: Request) => string;
  /** @deprecated Use `onComplete` instead. */
  onAfterUpload?: (result: UploadResult, req: Request) => Promise<void> | void;
}

export interface HandlerResponse {
  files: UploadResult[];
}

export class UploadError extends HandlerError {}
