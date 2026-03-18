export interface HandlerRestrictions {
  maxFileSize?: string | number;
  allowedTypes?: string[];
  maxFiles?: number;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
}

export interface UploadResult {
  name: string;
  path: string;
  size: number;
  url: string;
}

import type { regions } from "@bunny.net/storage-sdk";

export interface HandlerOptions {
  storageZone?: string;
  storagePassword?: string;
  cdnBase?: string;
  storageRegion?: regions.StorageRegion;
  restrictions?: HandlerRestrictions;
  onBeforeUpload?: (file: FileInfo, req: Request) => Promise<void> | void;
  getPath?: (file: FileInfo, req: Request) => string;
  onAfterUpload?: (result: UploadResult, req: Request) => Promise<void> | void;
}

export interface HandlerResponse {
  files: UploadResult[];
}

export class UploadError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "UploadError";
    this.statusCode = statusCode;
  }
}
