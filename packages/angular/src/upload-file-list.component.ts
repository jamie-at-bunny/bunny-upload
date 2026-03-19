import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { formatBytes, type FileState } from "@bunny.net/upload-core";

@Component({
  selector: "bunny-upload-file-list",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (files().length > 0) {
      <ul class="bunny-upload-file-list">
        @for (file of files(); track file.id) {
          <li class="bunny-upload-file" [class]="'bunny-upload-file--' + file.status">
            <div class="bunny-upload-file-info">
              <span class="bunny-upload-file-name">{{ file.name }}</span>
              <span class="bunny-upload-file-size">{{ formatFileSize(file.size) }}</span>
            </div>
            @if (file.status === "uploading") {
              <div class="bunny-upload-progress">
                <div class="bunny-upload-progress-bar" [style.width.%]="file.progress"></div>
              </div>
            }
            @if (file.status === "error") {
              <div class="bunny-upload-file-error">
                <span>{{ file.error }}</span>
                <button class="bunny-upload-retry" (click)="retry.emit()">Retry</button>
              </div>
            }
            @if (file.status === "complete") {
              <span class="bunny-upload-file-complete">Uploaded</span>
            }
            @if (file.status === "idle" || file.status === "error") {
              <button
                class="bunny-upload-remove"
                (click)="remove.emit(file.id)"
                [attr.aria-label]="'Remove ' + file.name"
              >&times;</button>
            }
          </li>
        }
      </ul>
    }
  `,
})
export class UploadFileListComponent {
  readonly files = input.required<FileState[]>();
  readonly remove = output<string>();
  readonly retry = output<void>();

  formatFileSize(bytes: number): string {
    return formatBytes(bytes);
  }
}
