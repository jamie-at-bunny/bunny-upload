import type { regions } from "@bunny.net/storage-sdk";

export interface StorageEntry {
  guid: string;
  objectName: string;
  path: string;
  isDirectory: boolean;
  length: number;
  contentType: string;
  lastChanged: string;
  dateCreated: string;
  checksum: string | null;
}

export interface FileManagerHandlerOptions {
  storageZone?: string;
  storagePassword?: string;
  cdnBase?: string;
  storageRegion?: regions.StorageRegion;
  onBeforeList?: (path: string, req: Request) => Promise<void> | void;
  onBeforeDelete?: (path: string, req: Request) => Promise<void> | void;
  onBeforeCreateFolder?: (path: string, req: Request) => Promise<void> | void;
  onBeforeDownload?: (path: string, req: Request) => Promise<void> | void;
  onBeforeImport?: (url: string, path: string, req: Request) => Promise<void> | void;
}

export class FileManagerError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "FileManagerError";
    this.statusCode = statusCode;
  }
}
