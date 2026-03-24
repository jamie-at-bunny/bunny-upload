import { createUploader, createDropzone, formatBytes } from "@bunny.net/upload-core";

const dropzoneEl = document.getElementById("dropzone")!;
const fileListEl = document.getElementById("file-list")!;
const uploadBtn = document.getElementById("upload-btn") as HTMLButtonElement;
const resetBtn = document.getElementById("reset-btn") as HTMLButtonElement;

// Create a dropzone with presigned: true — files upload directly to S3
// instead of being proxied through your server.
const dropzone = createDropzone(dropzoneEl, {
  presigned: true,
  autoUpload: false,
  restrictions: {
    allowedTypes: ["image/*"],
    maxFileSize: "10mb",
    maxFiles: 5,
  },
  onDragOver: (isDragOver) => {
    dropzoneEl.classList.toggle("active", isDragOver);
  },
});

const uploader = dropzone.uploader;

dropzoneEl.addEventListener("click", () => dropzone.openFilePicker());

uploader.on("state-change", (files) => {
  renderFileList(files);
  const hasFiles = files.length > 0;
  const isUploading = files.some((f) => f.status === "uploading");
  uploadBtn.disabled = !hasFiles || isUploading;
  resetBtn.disabled = !hasFiles;
  uploadBtn.textContent = isUploading ? "Uploading..." : "Upload";
});

uploader.on("complete", (results) => {
  console.log("Uploaded via presigned URLs:", results.map((r) => r.url));
});

uploadBtn.addEventListener("click", () => uploader.upload());
resetBtn.addEventListener("click", () => uploader.reset());

function renderFileList(files: { id: string; name: string; size: number; status: string; progress: number; error?: string }[]) {
  fileListEl.innerHTML = files
    .map((f) => {
      let status = "";
      if (f.status === "uploading") {
        status =
          '<div class="progress">' +
          '<div class="progress-bar" style="width: ' + f.progress + '%"></div>' +
          "</div>";
      } else if (f.status === "complete") {
        status = '<span class="file-status complete">✓</span>';
      } else if (f.status === "error") {
        status = '<span class="file-status error">' + f.error + "</span>";
      }

      const remove =
        f.status === "idle" || f.status === "error"
          ? '<button class="remove" data-id="' + f.id + '">×</button>'
          : "";

      return (
        "<li>" +
        '<span><span class="file-name">' + f.name + "</span>" +
        '<span class="file-size">' + formatBytes(f.size) + "</span></span>" +
        status +
        remove +
        "</li>"
      );
    })
    .join("");

  fileListEl.querySelectorAll(".remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      uploader.removeFile((btn as HTMLElement).dataset.id!);
    });
  });
}
