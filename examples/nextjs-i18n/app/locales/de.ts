import type { BunnyUploadLocale } from "@bunny.net/upload-react";

export const de: BunnyUploadLocale = {
  // Upload
  chooseFile: "Datei auswählen",
  uploadFiles: "Dateien hochladen",
  uploadTab: "Hochladen",
  browseTab: "Durchsuchen",
  uploading: "Wird hochgeladen...",
  upload: "Hochladen",
  uploaded: "Hochgeladen",
  done: "Fertig",
  failed: "Fehlgeschlagen",
  retry: "Erneut versuchen",

  // Dropzone
  dropToUpload: "Zum Hochladen ablegen",
  dropOrBrowse: "Dateien hierher ziehen oder klicken zum Durchsuchen",

  // File manager
  browseFiles: "Dateien durchsuchen",
  loading: "Wird geladen\u2026",
  noFilesFound: "Keine Dateien gefunden",
  newFolder: "Neuer Ordner",
  folderNamePrompt: "Ordnername:",
  uploadFile: "Datei hochladen",
  uploadingFile: "Wird hochgeladen\u2026",
  delete: "Löschen",
  select: "Auswählen",

  // ARIA
  ariaClose: "Schließen",
  ariaDropzone: "Dateien hierher ziehen oder klicken zum Durchsuchen",
  ariaFileNavigation: "Dateinavigation",
  ariaMoreActions: "Weitere Aktionen",
  ariaCreateNewFolder: "Neuen Ordner erstellen",

  // Dynamic
  maxSizeHint: (size, maxFiles) =>
    `Max. ${size}${maxFiles ? ` \u00b7 ${maxFiles} Datei${maxFiles > 1 ? "en" : ""}` : ""}`,
  selectCount: (count) =>
    `${count} Datei${count > 1 ? "en" : ""} auswählen`,
  selectedCount: (count) => `${count} ausgewählt`,
  moreCount: (count) => `+${count} weitere`,
  ariaUploadingFile: (name) => `${name} wird hochgeladen`,
  ariaRemoveFile: (name) => `${name} entfernen`,
  ariaSelectEntry: (name) => `${name} auswählen`,
  deleteConfirm: (name) => `„${name}" löschen?`,
  deleteCountConfirm: (count) =>
    `${count} Element${count > 1 ? "e" : ""} löschen?`,
  ariaEntryLabel: (type, name, selected) =>
    `${type === "folder" ? "Ordner" : "Datei"}: ${name}${selected ? " (ausgewählt)" : ""}`,
};
