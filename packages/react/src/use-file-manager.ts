import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
  createFileManager,
  type FileManager,
  type FileManagerAction,
  type FileManagerOptions,
  type FileManagerState,
  type StorageEntry,
} from "@bunny.net/file-manager-core";

export interface UseFileManagerOptions {
  endpoint?: string;
  cdnBase?: string;
  initialPath?: string;
  actions?: FileManagerAction[];
}

export interface UseFileManagerReturn {
  /** All entries in the current directory */
  entries: StorageEntry[];
  /** Current directory path */
  currentPath: string;
  /** Loading / idle / error status */
  status: FileManagerState["status"];
  /** Error message if status is "error" */
  error?: string;
  /** Currently selected entries */
  selected: StorageEntry[];
  /** Breadcrumb trail for current path */
  breadcrumbs: { label: string; path: string }[];
  /** Navigate to a directory */
  navigate: (path: string) => Promise<void>;
  /** Go to parent directory */
  goUp: () => Promise<void>;
  /** Refresh current directory */
  refresh: () => Promise<void>;
  /** Toggle selection of an entry by guid */
  toggleSelect: (guid: string) => void;
  /** Select all entries */
  selectAll: () => void;
  /** Deselect all entries */
  deselectAll: () => void;
  /** Create a folder in the current directory */
  createFolder: (name: string) => Promise<void>;
  /** Delete an entry by path */
  deleteEntry: (path: string) => Promise<void>;
  /** Delete all selected entries */
  deleteSelected: () => Promise<void>;
  /** Import a file from a URL */
  importFromUrl: (url: string, filename?: string) => Promise<void>;
  /** Get CDN URL for a path */
  cdnUrl: (path: string) => string;
  /** Get download URL for a path */
  downloadUrl: (path: string) => string;
  /** Get applicable actions for current selection (or provided entries) */
  getActions: (entries?: StorageEntry[]) => FileManagerAction[];
  /** Execute a registered action */
  executeAction: (actionId: string, entries?: StorageEntry[]) => Promise<void>;
  /** The underlying FileManager instance */
  manager: FileManager;
}

export function useFileManager(
  options: UseFileManagerOptions = {}
): UseFileManagerReturn {
  const { endpoint, cdnBase, initialPath, actions } = options;

  const managerRef = useRef<FileManager>(null!);
  if (managerRef.current === null) {
    managerRef.current = createFileManager({
      endpoint,
      cdnBase,
      initialPath,
      actions,
    });
  }

  const manager = managerRef.current;

  // Load initial directory
  useEffect(() => {
    manager.navigate(manager.getState().currentPath);
  }, [manager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => manager.destroy();
  }, [manager]);

  const subscribe = useCallback(
    (callback: () => void) => manager.subscribe(callback),
    [manager]
  );

  const getSnapshot = useCallback(() => manager.getState(), [manager]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const selected = state.entries.filter((e) => state.selected.has(e.guid));
  const breadcrumbs = manager.getBreadcrumbs();

  const navigate = useCallback(
    (path: string) => manager.navigate(path),
    [manager]
  );
  const goUp = useCallback(() => manager.goUp(), [manager]);
  const refresh = useCallback(() => manager.refresh(), [manager]);
  const toggleSelect = useCallback(
    (guid: string) => manager.toggleSelect(guid),
    [manager]
  );
  const selectAll = useCallback(() => manager.selectAll(), [manager]);
  const deselectAll = useCallback(() => manager.deselectAll(), [manager]);
  const createFolder = useCallback(
    (name: string) => manager.createFolder(name),
    [manager]
  );
  const deleteEntry = useCallback(
    (path: string) => manager.deleteEntry(path),
    [manager]
  );
  const deleteSelected = useCallback(
    () => manager.deleteSelected(),
    [manager]
  );
  const importFromUrl = useCallback(
    (url: string, filename?: string) => manager.importFromUrl(url, filename),
    [manager]
  );
  const cdnUrl = useCallback(
    (path: string) => manager.cdnUrl(path),
    [manager]
  );
  const downloadUrl = useCallback(
    (path: string) => manager.downloadUrl(path),
    [manager]
  );
  const getActions = useCallback(
    (entries?: StorageEntry[]) => manager.getActions(entries),
    [manager]
  );
  const executeAction = useCallback(
    (actionId: string, entries?: StorageEntry[]) =>
      manager.executeAction(actionId, entries),
    [manager]
  );

  return {
    entries: state.entries,
    currentPath: state.currentPath,
    status: state.status,
    error: state.error,
    selected,
    breadcrumbs,
    navigate,
    goUp,
    refresh,
    toggleSelect,
    selectAll,
    deselectAll,
    createFolder,
    deleteEntry,
    deleteSelected,
    importFromUrl,
    cdnUrl,
    downloadUrl,
    getActions,
    executeAction,
    manager,
  };
}
