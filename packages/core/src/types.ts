export type {
  Restrictions,
  UploadResult,
  PresignResult,
  PresignResponse,
} from "@bunny.net/upload-shared";

import type { Restrictions, UploadResult } from "@bunny.net/upload-shared";

export type FileStatus = "idle" | "uploading" | "complete" | "error";

export interface FileState {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: FileStatus;
  url?: string;
  error?: string;
}

export interface UploadResponse {
  files: UploadResult[];
}

export const DEFAULT_ENDPOINT = "/.bunny/upload";

export interface UploaderOptions {
  endpoint?: string;
  restrictions?: Restrictions;
  presigned?: boolean;
}

export type UploaderEvent =
  | "state-change"
  | "complete"
  | "error"
  | "file-added"
  | "file-removed"
  | "upload-progress";

export type EventMap = {
  "state-change": (files: FileState[]) => void;
  complete: (results: UploadResult[]) => void;
  error: (error: Error, file?: FileState) => void;
  "file-added": (file: FileState) => void;
  "file-removed": (file: FileState) => void;
  "upload-progress": (file: FileState) => void;
};
