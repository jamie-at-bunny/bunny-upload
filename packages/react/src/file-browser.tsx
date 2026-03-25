import React, { useCallback, useMemo } from "react";
import type { StorageEntry } from "@bunny.net/file-manager-core";
import { useFileManager, type UseFileManagerOptions } from "./use-file-manager";
import {
  Breadcrumbs,
  ContentStatus,
  EntryCard,
  filterAndSortEntries,
} from "./file-manager-shared";

export interface FileBrowserProps extends Omit<UseFileManagerOptions, "actions"> {
  /** View mode (default: "grid") */
  view?: "grid" | "list";
  /** Filter visible entries by file extension */
  accept?: string[];
  /** Additional CSS class */
  className?: string;
}

/**
 * Read-only file browser. Renders an inline browsable view of files
 * in a Bunny Storage zone. No selection, no actions, no uploads.
 *
 * @example
 * ```tsx
 * <FileBrowser />
 * ```
 */
export function FileBrowser({
  view = "grid",
  accept,
  className,
  ...options
}: FileBrowserProps) {
  const fm = useFileManager(options);

  const visibleEntries = useMemo(
    () => filterAndSortEntries(fm.entries, accept),
    [fm.entries, accept]
  );

  const handleEntryClick = useCallback(
    (entry: StorageEntry) => {
      if (entry.isDirectory) {
        fm.navigate(`${entry.path}${entry.objectName}/`);
      }
    },
    [fm]
  );

  return (
    <div className={`bunny-fm ${className ?? ""}`.trim()}>
      <Breadcrumbs
        breadcrumbs={fm.breadcrumbs}
        currentPath={fm.currentPath}
        onNavigate={fm.navigate}
      />

      <div className="bunny-fm__content">
        <ContentStatus
          status={fm.status}
          error={fm.error}
          isEmpty={visibleEntries.length === 0}
          onRetry={fm.refresh}
        />

        {fm.status === "idle" && visibleEntries.length > 0 && (
          <div className={view === "grid" ? "bunny-fm__grid" : "bunny-fm__list"}>
            {visibleEntries.map((entry) => (
              <EntryCard
                key={entry.guid}
                entry={entry}
                url={fm.cdnUrl(`${entry.path}${entry.objectName}`)}
                onClick={() => handleEntryClick(entry)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
