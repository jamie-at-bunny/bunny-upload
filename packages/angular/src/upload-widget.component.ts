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
  AfterViewInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { formatBytes, type UploadResult } from "@bunny.net/upload-core";
import { BunnyUploadService } from "./bunny-upload.service";

@Component({
  selector: "bunny-upload-widget",
  standalone: true,
  imports: [CommonModule],
  providers: [BunnyUploadService],
  template: `
    <ng-content select="[trigger]">
      <button type="button" class="bunny-widget-trigger" (click)="open()">
        {{ label() }}
      </button>
    </ng-content>

    @if (isOpen()) {
      <dialog
        #dialog
        class="bunny-widget-dialog"
        (close)="close()"
        (click)="onBackdropClick($event)"
      >
        <div class="bunny-widget">
          <div class="bunny-widget-header">
            <span class="bunny-widget-title">{{ label() }}</span>
            <button type="button" class="bunny-widget-close" (click)="close()" aria-label="Close">
              &times;
            </button>
          </div>

          <div
            class="bunny-widget-dropzone"
            [class.bunny-widget-dropzone--active]="isDragOver()"
            (drop)="onDrop($event)"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (click)="fileInput.click()"
            (keydown.enter)="fileInput.click()"
            (keydown.space)="fileInput.click()"
            role="button"
            tabindex="0"
          >
            <input
              #fileInput
              type="file"
              [multiple]="maxFiles() !== 1"
              [accept]="acceptString()"
              (change)="onFileChange($event)"
              hidden
            />
            <p class="bunny-widget-dropzone-text">
              {{ isDragOver() ? "Drop to upload" : "Drop files here or click to browse" }}
            </p>
            @if (maxSize()) {
              <p class="bunny-widget-hint">
                Max {{ maxSize() }}@if (maxFiles()) { &middot; {{ maxFiles() }} file{{ maxFiles()! > 1 ? "s" : "" }}}
              </p>
            }
          </div>

          @if (uploadService.files().length > 0) {
            <ul class="bunny-widget-file-list">
              @for (file of uploadService.files(); track file.id) {
                <li class="bunny-widget-file" [class]="'bunny-widget-file--' + file.status">
                  <span class="bunny-widget-file-name">{{ file.name }}</span>
                  <span class="bunny-widget-file-size">{{ formatFileSize(file.size) }}</span>
                  @if (file.status === "uploading") {
                    <div class="bunny-widget-progress">
                      <div class="bunny-widget-progress-bar" [style.width.%]="file.progress"></div>
                    </div>
                  }
                  @if (file.status === "complete") {
                    <span class="bunny-widget-file-complete">&#10003;</span>
                  }
                  @if (file.status === "error") {
                    <span class="bunny-widget-file-error">{{ file.error ?? "Failed" }}</span>
                  }
                  @if (file.status === "idle" || file.status === "error") {
                    <button
                      class="bunny-widget-file-remove"
                      (click)="uploadService.removeFile(file.id)"
                      [attr.aria-label]="'Remove ' + file.name"
                    >&times;</button>
                  }
                </li>
              }
            </ul>
          }

          <div class="bunny-widget-footer">
            @if (!autoUpload() && hasIdleFiles()) {
              <button
                type="button"
                class="bunny-widget-upload"
                (click)="doUpload()"
                [disabled]="uploadService.isUploading()"
              >
                {{ uploadService.isUploading() ? "Uploading..." : "Upload" }}
              </button>
            }
            @if (allComplete()) {
              <button type="button" class="bunny-widget-done" (click)="close()">
                Done
              </button>
            }
          </div>
        </div>
      </dialog>
    }
  `,
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
