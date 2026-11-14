import type { regions } from "@bunny.net/storage-sdk";
import { HandlerError } from "@bunny.net/upload-shared";

export type { StorageEntry } from "@bunny.net/file-manager-core";
export { HandlerError } from "@bunny.net/upload-shared";

export type FileManagerOperation =
  | "list"
  | "download"
  | "createFolder"
  | "delete"
  | "importFromUrl";

export type FileManagerAuthorizeContext =
  | {
      request: Request;
      operation: "list" | "download" | "createFolder" | "delete";
      path: string;
    }
  | {
      request: Request;
      operation: "importFromUrl";
      path: string;
      url: string;
    };

export interface FileManagerHandlerOptions {
  storageZone?: string;
  storagePassword?: string;
  cdnBase?: string;
  storageRegion?: regions.StorageRegion;

  authorize?: (
    ctx: FileManagerAuthorizeContext
  ) => Promise<boolean | void> | boolean | void;

  /** @deprecated Use `authorize` with `operation: "list"` instead. */
  onBeforeList?: (path: string, req: Request) => Promise<void> | void;
  /** @deprecated Use `authorize` with `operation: "delete"` instead. */
  onBeforeDelete?: (path: string, req: Request) => Promise<void> | void;
  /** @deprecated Use `authorize` with `operation: "createFolder"` instead. */
  onBeforeCreateFolder?: (path: string, req: Request) => Promise<void> | void;
  /** @deprecated Use `authorize` with `operation: "download"` instead. */
  onBeforeDownload?: (path: string, req: Request) => Promise<void> | void;
  /** @deprecated Use `authorize` with `operation: "importFromUrl"` instead. */
  onBeforeImport?: (
    url: string,
    path: string,
    req: Request
  ) => Promise<void> | void;
}

export class FileManagerError extends HandlerError {}
