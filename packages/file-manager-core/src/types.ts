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

export type FileManagerStatus = "idle" | "loading" | "error";

export interface FileManagerState {
  currentPath: string;
  entries: StorageEntry[];
  selected: Set<string>;
  status: FileManagerStatus;
  error?: string;
}

export type ActionTarget = "single" | "multi" | "both";

export interface FileManagerAction {
  id: string;
  label: string;
  icon?: string;
  target: ActionTarget;
  isApplicable?: (entries: StorageEntry[]) => boolean;
  handler: (
    entries: StorageEntry[],
    context: ActionContext
  ) => Promise<void> | void;
}

export interface ActionContext {
  fileManager: FileManagerInterface;
  cdnBase?: string;
}

/** Minimal interface exposed to actions to avoid circular deps */
export interface FileManagerInterface {
  navigate(path: string): Promise<void>;
  refresh(): Promise<void>;
  getState(): FileManagerState;
  cdnUrl(path: string): string;
  downloadUrl(path: string): string;
}

export interface FileManagerOptions {
  endpoint?: string;
  cdnBase?: string;
  initialPath?: string;
  actions?: FileManagerAction[];
}

export interface ListResponse {
  path: string;
  entries: StorageEntry[];
  cdnBase: string;
}

export type FileManagerEventMap = {
  "state-change": (state: FileManagerState) => void;
  navigate: (path: string) => void;
  "entries-loaded": (entries: StorageEntry[]) => void;
  "selection-change": (selected: StorageEntry[]) => void;
  error: (error: Error) => void;
  "action-start": (actionId: string, entries: StorageEntry[]) => void;
  "action-complete": (actionId: string, entries: StorageEntry[]) => void;
  "import-start": (url: string, path: string) => void;
  "import-complete": (url: string, path: string) => void;
};
