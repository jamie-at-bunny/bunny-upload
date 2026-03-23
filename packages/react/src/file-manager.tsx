import React from "react";
import type { StorageEntry, FileManagerAction } from "@bunny.net/file-manager-core";
import {
  useFileManager,
  type UseFileManagerOptions,
  type UseFileManagerReturn,
} from "./use-file-manager";

export interface FileManagerRenderProps extends UseFileManagerReturn {
  /** Get the CDN URL for an entry */
  entryUrl: (entry: StorageEntry) => string;
  /** Get CDN URLs for all selected entries */
  selectedUrls: string[];
}

export interface FileManagerProps extends UseFileManagerOptions {
  children: (props: FileManagerRenderProps) => React.ReactNode;
}

/**
 * Render-props component for building fully custom file manager UIs.
 *
 * @example
 * ```tsx
 * <FileManager endpoint="/api/files">
 *   {({ entries, selected, selectedUrls, navigate, toggleSelect }) => (
 *     <div>
 *       {entries.map(entry => (
 *         <div key={entry.guid} onClick={() =>
 *           entry.isDirectory
 *             ? navigate(entry.path + entry.objectName + "/")
 *             : toggleSelect(entry.guid)
 *         }>
 *           {entry.objectName}
 *         </div>
 *       ))}
 *       {selected.length > 0 && (
 *         <button onClick={() => console.log(selectedUrls)}>
 *           Use {selected.length} file(s)
 *         </button>
 *       )}
 *     </div>
 *   )}
 * </FileManager>
 * ```
 */
export function FileManager({
  children,
  ...options
}: FileManagerProps) {
  const fm = useFileManager(options);

  const entryUrl = (entry: StorageEntry) =>
    fm.cdnUrl(`${entry.path}${entry.objectName}`);

  const selectedUrls = fm.selected
    .filter((e) => !e.isDirectory)
    .map((e) => fm.cdnUrl(`${e.path}${e.objectName}`));

  return <>{children({ ...fm, entryUrl, selectedUrls })}</>;
}
