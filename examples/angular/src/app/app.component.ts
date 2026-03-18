import { Component } from "@angular/core";
import { BunnyUploadComponent, type UploadResult } from "@bunny.net/upload-angular";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [BunnyUploadComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  uploadedFiles: UploadResult[] = [];

  onComplete(files: UploadResult[]) {
    this.uploadedFiles = [...this.uploadedFiles, ...files];
    console.log(
      "Uploaded:",
      files.map((f) => f.url)
    );
  }
}
