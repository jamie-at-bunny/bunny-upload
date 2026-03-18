import {
  Component,
  input,
  output,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { formatBytes, type UploadResult } from "@bunny-upload/core";
import { BunnyUploadService } from "./bunny-upload.service";

@Component({
  selector: "bunny-upload",
  standalone: true,
  imports: [CommonModule],
  providers: [BunnyUploadService],
  templateUrl: "./bunny-upload.component.html",
})
export class BunnyUploadComponent implements OnInit {
  readonly endpoint = input<string>();
  readonly accept = input<string[]>();
  readonly maxSize = input<string | number>();
  readonly maxFiles = input<number>();
  readonly autoUpload = input(true);
  readonly className = input("");

  readonly completed = output<UploadResult[]>();
  readonly errored = output<Error>();

  @ViewChild("fileInput") fileInput!: ElementRef<HTMLInputElement>;

  uploadService = inject(BunnyUploadService);
  isDragOver = false;

  ngOnInit() {
    this.uploadService.configure({
      endpoint: this.endpoint(),
      restrictions: {
        allowedTypes: this.accept(),
        maxFileSize: this.maxSize(),
        maxFiles: this.maxFiles(),
      },
    });
  }

  acceptString(): string {
    return this.accept()?.join(",") ?? "";
  }

  hasIdleFiles(): boolean {
    return this.uploadService.files().some((f) => f.status === "idle");
  }

  formatFileSize(bytes: number): string {
    return formatBytes(bytes);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    if (event.dataTransfer?.files.length) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFiles(input.files);
      input.value = "";
    }
  }

  async retry() {
    const results = await this.uploadService.upload();
    if (results.length > 0) {
      this.completed.emit(results);
    }
  }

  private async handleFiles(fileList: FileList) {
    this.uploadService.addFiles(fileList);
    if (this.autoUpload()) {
      const results = await this.uploadService.upload();
      if (results.length > 0) {
        this.completed.emit(results);
      }
    }
  }
}
