import { Injectable, signal, computed } from "@angular/core";
import {
  createUploader,
  type FileState,
  type Restrictions,
  type UploadResult,
  type UploaderOptions,
} from "@bunny-upload/core";

@Injectable()
export class BunnyUploadService {
  private uploader = createUploader();

  readonly files = signal<FileState[]>([]);
  readonly isUploading = computed(() =>
    this.files().some((f) => f.status === "uploading")
  );

  configure(options: UploaderOptions) {
    this.uploader = createUploader(options);

    this.uploader.on("state-change", (files) => {
      this.files.set(files);
    });
  }

  addFiles(files: FileList | File[]) {
    this.uploader.addFiles(files);
  }

  removeFile(id: string) {
    this.uploader.removeFile(id);
  }

  async upload(): Promise<UploadResult[]> {
    return this.uploader.upload();
  }

  reset() {
    this.uploader.reset();
  }
}
