import type { BunnyUploadLocale } from "@bunny.net/upload-react";

export const es: BunnyUploadLocale = {
  // Upload
  chooseFile: "Elegir archivo",
  uploadFiles: "Subir archivos",
  uploadTab: "Subir",
  browseTab: "Explorar",
  uploading: "Subiendo...",
  upload: "Subir",
  uploaded: "Subido",
  done: "Listo",
  failed: "Error",
  retry: "Reintentar",

  // Dropzone
  dropToUpload: "Soltar para subir",
  dropOrBrowse: "Arrastra archivos aquí o haz clic para explorar",

  // File manager
  browseFiles: "Explorar archivos",
  loading: "Cargando\u2026",
  noFilesFound: "No se encontraron archivos",
  newFolder: "Nueva carpeta",
  folderNamePrompt: "Nombre de la carpeta:",
  uploadFile: "Subir archivo",
  uploadingFile: "Subiendo\u2026",
  delete: "Eliminar",
  select: "Seleccionar",

  // ARIA
  ariaClose: "Cerrar",
  ariaDropzone: "Arrastra archivos aquí o haz clic para explorar",
  ariaFileNavigation: "Navegación de archivos",
  ariaMoreActions: "Más acciones",
  ariaCreateNewFolder: "Crear nueva carpeta",

  // Dynamic
  maxSizeHint: (size, maxFiles) =>
    `Máx. ${size}${maxFiles ? ` \u00b7 ${maxFiles} archivo${maxFiles > 1 ? "s" : ""}` : ""}`,
  selectCount: (count) =>
    `Seleccionar ${count} archivo${count > 1 ? "s" : ""}`,
  selectedCount: (count) =>
    `${count} seleccionado${count > 1 ? "s" : ""}`,
  moreCount: (count) => `+${count} más`,
  ariaUploadingFile: (name) => `Subiendo ${name}`,
  ariaRemoveFile: (name) => `Eliminar ${name}`,
  ariaSelectEntry: (name) => `Seleccionar ${name}`,
  deleteConfirm: (name) => `¿Eliminar "${name}"?`,
  deleteCountConfirm: (count) =>
    `¿Eliminar ${count} elemento${count > 1 ? "s" : ""}?`,
  ariaEntryLabel: (type, name, selected) =>
    `${type === "folder" ? "Carpeta" : "Archivo"}: ${name}${selected ? " (seleccionado)" : ""}`,
};
