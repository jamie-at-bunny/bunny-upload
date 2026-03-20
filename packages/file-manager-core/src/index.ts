import { FileManager } from "./file-manager";
import type { FileManagerOptions } from "./types";

export function createFileManager(options?: FileManagerOptions): FileManager {
  return new FileManager(options);
}

export { FileManager } from "./file-manager";
export type {
  StorageEntry,
  FileManagerStatus,
  FileManagerState,
  ActionTarget,
  FileManagerAction,
  ActionContext,
  FileManagerInterface,
  FileManagerOptions,
  ListResponse,
  FileManagerEventMap,
} from "./types";
