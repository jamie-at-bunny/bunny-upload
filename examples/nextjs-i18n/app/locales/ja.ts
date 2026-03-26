import type { BunnyUploadLocale } from "@bunny.net/upload-react";

export const ja: BunnyUploadLocale = {
  // Upload
  chooseFile: "ファイルを選択",
  uploadFiles: "ファイルをアップロード",
  uploadTab: "アップロード",
  browseTab: "参照",
  uploading: "アップロード中...",
  upload: "アップロード",
  uploaded: "アップロード完了",
  done: "完了",
  failed: "失敗",
  retry: "再試行",

  // Dropzone
  dropToUpload: "ドロップしてアップロード",
  dropOrBrowse: "ファイルをここにドラッグするか、クリックして参照",

  // File manager
  browseFiles: "ファイルを参照",
  loading: "読み込み中\u2026",
  noFilesFound: "ファイルが見つかりません",
  newFolder: "新しいフォルダ",
  folderNamePrompt: "フォルダ名:",
  uploadFile: "ファイルをアップロード",
  uploadingFile: "アップロード中\u2026",
  delete: "削除",
  select: "選択",

  // ARIA
  ariaClose: "閉じる",
  ariaDropzone: "ファイルをここにドラッグするか、クリックして参照",
  ariaFileNavigation: "ファイルナビゲーション",
  ariaMoreActions: "その他のアクション",
  ariaCreateNewFolder: "新しいフォルダを作成",

  // Dynamic
  maxSizeHint: (size, maxFiles) =>
    `最大 ${size}${maxFiles ? ` · ${maxFiles}ファイル` : ""}`,
  selectCount: (count) => `${count}件のファイルを選択`,
  selectedCount: (count) => `${count}件選択中`,
  moreCount: (count) => `他${count}件`,
  ariaUploadingFile: (name) => `${name}をアップロード中`,
  ariaRemoveFile: (name) => `${name}を削除`,
  ariaSelectEntry: (name) => `${name}を選択`,
  deleteConfirm: (name) => `「${name}」を削除しますか？`,
  deleteCountConfirm: (count) => `${count}件のアイテムを削除しますか？`,
  ariaEntryLabel: (type, name, selected) =>
    `${type === "folder" ? "フォルダ" : "ファイル"}: ${name}${selected ? "（選択中）" : ""}`,
};
