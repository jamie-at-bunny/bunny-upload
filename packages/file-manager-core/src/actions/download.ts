import type { FileManagerAction } from "../types";

export const downloadAction: FileManagerAction = {
  id: "download",
  label: "Download",
  icon: "download",
  target: "single",
  isApplicable: (entries) => !entries[0].isDirectory,
  handler: (entries, { fileManager }) => {
    const entry = entries[0];
    const path = `${entry.path}${entry.objectName}`;
    const url = fileManager.downloadUrl(path);

    // Open in new tab to trigger browser download
    window.open(url, "_blank");
  },
};
