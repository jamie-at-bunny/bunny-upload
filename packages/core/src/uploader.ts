import { Emitter } from "./emitter";
import {
  DEFAULT_ENDPOINT,
  type FileState,
  type Restrictions,
  type UploadResponse,
  type UploadResult,
  type UploaderOptions,
  type EventMap,
} from "./types";
import { generateId, matchesMimeType, parseFileSize } from "./utils";

const DEFAULT_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export class Uploader {
  private files = new Map<string, FileState>();
  private emitter = new Emitter();
  private endpoint: string;
  private restrictions: Restrictions;

  constructor(options: UploaderOptions = {}) {
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    this.restrictions = options.restrictions ?? {};
  }

  on<K extends keyof EventMap>(event: K, fn: EventMap[K]): () => void {
    return this.emitter.on(event, fn);
  }

  off<K extends keyof EventMap>(event: K, fn: EventMap[K]): void {
    this.emitter.off(event, fn);
  }

  getFiles(): FileState[] {
    return Array.from(this.files.values());
  }

  addFiles(input: FileList | File[]): FileState[] {
    const filesToAdd = Array.from(input);
    const added: FileState[] = [];

    for (const file of filesToAdd) {
      const error = this.validate(file);

      const fileState: FileState = {
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: error ? "error" : "idle",
        error: error ?? undefined,
      };

      this.files.set(fileState.id, fileState);
      added.push(fileState);
      this.emitter.emit("file-added", fileState);

      if (error) {
        this.emitter.emit("error", new Error(error), fileState);
      }
    }

    this.emitter.emit("state-change", this.getFiles());
    return added;
  }

  removeFile(id: string): void {
    const file = this.files.get(id);
    if (!file) return;

    this.files.delete(id);
    this.emitter.emit("file-removed", file);
    this.emitter.emit("state-change", this.getFiles());
  }

  async upload(): Promise<UploadResult[]> {
    const filesToUpload = this.getFiles().filter(
      (f) => f.status === "idle" || f.status === "error"
    );

    if (filesToUpload.length === 0) return [];

    for (const file of filesToUpload) {
      this.updateFile(file.id, { status: "uploading", progress: 0, error: undefined });
    }

    const results: UploadResult[] = [];

    for (const file of filesToUpload) {
      try {
        const result = await this.uploadFileWithRetry(file);
        results.push(...result);
        this.updateFile(file.id, {
          status: "complete",
          progress: 100,
          url: result[0]?.url,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        this.updateFile(file.id, { status: "error", error: message });
        this.emitter.emit(
          "error",
          err instanceof Error ? err : new Error(message),
          this.files.get(file.id)
        );
      }
    }

    if (results.length > 0) {
      this.emitter.emit("complete", results);
    }

    return results;
  }

  reset(): void {
    this.files.clear();
    this.emitter.emit("state-change", []);
  }

  private validate(file: File): string | null {
    const { maxFileSize, allowedTypes, maxFiles } = this.restrictions;

    if (maxFiles != null && this.files.size >= maxFiles) {
      return `Maximum of ${maxFiles} files allowed`;
    }

    if (maxFileSize != null) {
      const maxBytes = parseFileSize(maxFileSize);
      if (file.size > maxBytes) {
        return `File exceeds maximum size`;
      }
    }

    if (allowedTypes && allowedTypes.length > 0) {
      const matches = allowedTypes.some((pattern) =>
        matchesMimeType(file.type, pattern)
      );
      if (!matches) {
        return `File type "${file.type}" is not allowed`;
      }
    }

    return null;
  }

  private async uploadFileWithRetry(
    file: FileState,
    retries = DEFAULT_RETRIES
  ): Promise<UploadResult[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.uploadFile(file);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error("Upload failed");

        if (attempt < retries) {
          const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private async uploadFile(fileState: FileState): Promise<UploadResult[]> {
    const formData = new FormData();
    formData.append("file", fileState.file);

    const xhr = new XMLHttpRequest();

    return new Promise<UploadResult[]>((resolve, reject) => {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          this.updateFile(fileState.id, { progress });
          this.emitter.emit("upload-progress", this.files.get(fileState.id)!);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response: UploadResponse = JSON.parse(xhr.responseText);
            resolve(response.files);
          } catch {
            reject(new Error("Invalid response from server"));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"));
      });

      xhr.open("POST", this.endpoint);
      xhr.send(formData);
    });
  }

  private updateFile(id: string, updates: Partial<FileState>): void {
    const file = this.files.get(id);
    if (!file) return;

    Object.assign(file, updates);
    this.emitter.emit("state-change", this.getFiles());
  }
}
