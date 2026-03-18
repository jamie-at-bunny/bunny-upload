import { Component } from "@angular/core";
import {
  BunnyUploadComponent,
  UploadDropzoneDirective,
  type UploadResult,
  type FileState,
  formatBytes,
} from "@bunny.net/upload-angular";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [BunnyUploadComponent, UploadDropzoneDirective],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  uploadedFiles: UploadResult[] = [];
  dropzoneFiles: FileState[] = [];

  formatBytes = formatBytes;

  onComplete(files: UploadResult[]) {
    this.uploadedFiles = [...this.uploadedFiles, ...files];
    console.log("Uploaded:", files.map((f) => f.url));
  }

  onDropzoneStateChange(files: FileState[]) {
    this.dropzoneFiles = files;
  }
}
