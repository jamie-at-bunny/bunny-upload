import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { formatBytes, type FileState } from "@bunny.net/upload-core";

@Component({
  selector: "bunny-upload-file-list",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./upload-file-list.component.html",
})
export class UploadFileListComponent {
  readonly files = input.required<FileState[]>();
  readonly remove = output<string>();
  readonly retry = output<void>();

  formatFileSize(bytes: number): string {
    return formatBytes(bytes);
  }
}
