import { Component, inject, OnInit } from "@angular/core";
import {
  BunnyUploadComponent,
  UploadWidgetComponent,
  UploadDropzoneDirective,
  UploadFileListComponent,
  BunnyUploadService,
  type UploadResult,
  type FileState,
  formatBytes,
} from "@bunny.net/upload-angular";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    BunnyUploadComponent,
    UploadWidgetComponent,
    UploadDropzoneDirective,
    UploadFileListComponent,
  ],
  providers: [BunnyUploadService],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent implements OnInit {
  dropzoneFiles: FileState[] = [];
  formatBytes = formatBytes;

  hookService = inject(BunnyUploadService);

  ngOnInit() {
    this.hookService.configure({
      restrictions: {
        allowedTypes: ["image/*"],
        maxFileSize: "10mb",
        maxFiles: 5,
      },
    });
  }

  roundProgress(progress: number): number {
    return Math.round(progress);
  }

  onComplete(files: UploadResult[]) {
    console.log("Uploaded:", files.map((f) => f.url));
  }

  onDropzoneStateChange(files: FileState[]) {
    this.dropzoneFiles = files;
  }

  onHookFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.hookService.addFiles(input.files);
      input.value = "";
    }
  }

  async hookUpload() {
    const results = await this.hookService.upload();
    if (results.length > 0) {
      console.log("Hook uploaded:", results);
    }
  }
}
