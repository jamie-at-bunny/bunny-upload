import type { FileManagerAction } from "../types";

export const copyUrlAction: FileManagerAction = {
  id: "copy-url",
  label: "Copy URL",
  icon: "link",
  target: "single",
  isApplicable: (entries) => !entries[0].isDirectory,
  handler: async (entries, { cdnBase }) => {
    if (!cdnBase) {
      throw new Error("cdnBase is required to copy URL");
    }

    const entry = entries[0];
    const path = `${entry.path}${entry.objectName}`;
    const url = `${cdnBase.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

    await navigator.clipboard.writeText(url);
  },
};
