/**
 * All user-facing strings used by bunny-upload components.
 *
 * Pass a partial locale object to override only the strings you need.
 * Dynamic strings use functions so pluralization works across languages.
 */
export interface BunnyUploadLocale {
  // ── Upload ──────────────────────────────────────────────────

  /** Default label for BunnyUpload button */
  chooseFile: string;
  /** Default label for UploadWidget trigger */
  uploadFiles: string;
  /** Tab label in UploadWidget when file manager is enabled */
  uploadTab: string;
  /** Tab label in UploadWidget for the browse tab */
  browseTab: string;
  /** Button text when uploading is in progress (manual upload) */
  uploading: string;
  /** Button text to start a manual upload */
  upload: string;
  /** Status text shown when a file has been uploaded */
  uploaded: string;
  /** Button text to close the widget after all uploads complete */
  done: string;
  /** Fallback error text when no specific error message exists */
  failed: string;
  /** Button text to retry a failed upload */
  retry: string;

  // ── Dropzone ────────────────────────────────────────────────

  /** Text shown when files are being dragged over the dropzone */
  dropToUpload: string;
  /** Default dropzone prompt */
  dropOrBrowse: string;

  // ── File manager ────────────────────────────────────────────

  /** Default label for FileManagerWidget trigger */
  browseFiles: string;
  /** Loading indicator text */
  loading: string;
  /** Empty state text when no files exist in the current path */
  noFilesFound: string;
  /** Label for the new-folder placeholder entry */
  newFolder: string;
  /** Prompt message shown when creating a new folder */
  folderNamePrompt: string;
  /** Label for the upload-file placeholder entry */
  uploadFile: string;
  /** Label shown on the upload-file entry while uploading */
  uploadingFile: string;
  /** Delete action label */
  delete: string;
  /** Single-select confirm button */
  select: string;

  // ── ARIA labels ─────────────────────────────────────────────

  /** aria-label for close buttons */
  ariaClose: string;
  /** aria-label for the dropzone area */
  ariaDropzone: string;
  /** aria-label for the file navigation breadcrumbs */
  ariaFileNavigation: string;
  /** aria-label for the "more actions" menu button */
  ariaMoreActions: string;
  /** aria-label for the new-folder entry */
  ariaCreateNewFolder: string;

  // ── Dynamic strings ─────────────────────────────────────────

  /** Hint text showing max file size and optional file count limit */
  maxSizeHint: (size: string, maxFiles?: number) => string;
  /** Multi-select confirm button: "Select 3 files" */
  selectCount: (count: number) => string;
  /** Footer selection indicator: "3 selected" */
  selectedCount: (count: number) => string;
  /** Overflow indicator: "+2 more" */
  moreCount: (count: number) => string;
  /** aria-label for upload progress: "Uploading photo.jpg" */
  ariaUploadingFile: (name: string) => string;
  /** aria-label for remove buttons: "Remove photo.jpg" */
  ariaRemoveFile: (name: string) => string;
  /** aria-label for entry selection: "Select photo.jpg" */
  ariaSelectEntry: (name: string) => string;
  /** Confirm dialog for deletion: 'Delete "photo.jpg"?' */
  deleteConfirm: (name: string) => string;
  /** Confirm dialog for bulk deletion: 'Delete 3 item(s)?' */
  deleteCountConfirm: (count: number) => string;
  /** aria-label for file/folder entries */
  ariaEntryLabel: (
    type: "file" | "folder",
    name: string,
    selected: boolean
  ) => string;
}

export const defaultLocale: BunnyUploadLocale = {
  // Upload
  chooseFile: "Choose file",
  uploadFiles: "Upload files",
  uploadTab: "Upload",
  browseTab: "Browse",
  uploading: "Uploading...",
  upload: "Upload",
  uploaded: "Uploaded",
  done: "Done",
  failed: "Failed",
  retry: "Retry",

  // Dropzone
  dropToUpload: "Drop to upload",
  dropOrBrowse: "Drop files here or click to browse",

  // File manager
  browseFiles: "Browse files",
  loading: "Loading\u2026",
  noFilesFound: "No files found",
  newFolder: "New folder",
  folderNamePrompt: "Folder name:",
  uploadFile: "Upload file",
  uploadingFile: "Uploading\u2026",
  delete: "Delete",
  select: "Select",

  // ARIA
  ariaClose: "Close",
  ariaDropzone: "Drop files here or click to browse",
  ariaFileNavigation: "File navigation",
  ariaMoreActions: "More actions",
  ariaCreateNewFolder: "Create new folder",

  // Dynamic
  maxSizeHint: (size, maxFiles) =>
    `Max ${size}${maxFiles ? ` \u00b7 ${maxFiles} file${maxFiles > 1 ? "s" : ""}` : ""}`,
  selectCount: (count) =>
    `Select ${count} file${count > 1 ? "s" : ""}`,
  selectedCount: (count) => `${count} selected`,
  moreCount: (count) => `+${count} more`,
  ariaUploadingFile: (name) => `Uploading ${name}`,
  ariaRemoveFile: (name) => `Remove ${name}`,
  ariaSelectEntry: (name) => `Select ${name}`,
  deleteConfirm: (name) => `Delete "${name}"?`,
  deleteCountConfirm: (count) => `Delete ${count} item(s)?`,
  ariaEntryLabel: (type, name, selected) =>
    `${type === "folder" ? "Folder" : "File"}: ${name}${selected ? " (selected)" : ""}`,
};

/**
 * Merge a partial locale with the defaults.
 * Only the keys you provide will be overridden.
 */
export function resolveLocale(
  partial?: Partial<BunnyUploadLocale>
): BunnyUploadLocale {
  if (!partial) return defaultLocale;
  return { ...defaultLocale, ...partial };
}
