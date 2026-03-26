import type { regions } from "@bunny.net/storage-sdk";
import { HandlerError } from "@bunny.net/upload-shared";

export type { StorageEntry } from "@bunny.net/file-manager-core";
export { HandlerError } from "@bunny.net/upload-shared";

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

export class FileManagerError extends HandlerError {}
