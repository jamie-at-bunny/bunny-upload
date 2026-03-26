import {
  Component,
  input,
  output,
  computed,
  inject,
  signal,
  OnInit,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { formatBytes, type UploadResult } from "@bunny.net/upload-core";
import { BunnyUploadService } from "./bunny-upload.service";

@Component({
  selector: "bunny-upload-widget",
  standalone: true,
  imports: [CommonModule],
  providers: [BunnyUploadService],
  templateUrl: "./upload-widget.component.html",
})
export class UploadWidgetComponent implements OnInit {
  readonly endpoint = input<string>();
  readonly accept = input<string[]>();
  readonly maxSize = input<string | number>();
  readonly maxFiles = input<number>();
  readonly autoUpload = input(true);
  readonly label = input("Upload files");

  readonly completed = output<UploadResult[]>();
  readonly errored = output<Error>();

  @ViewChild("dialog") dialogEl?: ElementRef<HTMLDialogElement>;

  uploadService = inject(BunnyUploadService);

  isOpen = signal(false);
  isDragOver = signal(false);

  readonly allComplete = computed(
    () =>
      this.uploadService.files().length > 0 &&
      this.uploadService.files().every((f) => f.status === "complete")
  );

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

  open() {
    this.isOpen.set(true);
    // Use setTimeout to wait for dialog element to be rendered
    setTimeout(() => this.dialogEl?.nativeElement.showModal());
  }

  close() {
    this.isOpen.set(false);
    this.uploadService.reset();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === this.dialogEl?.nativeElement) {
      this.close();
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
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

  async doUpload() {
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
