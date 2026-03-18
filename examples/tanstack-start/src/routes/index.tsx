import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BunnyUpload, UploadDropzone, formatBytes, type UploadResult } from "@bunny.net/upload-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [uploaded, setUploaded] = useState<UploadResult[]>([]);

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
      <h1>Bunny Upload — TanStack Start</h1>

      <h2>Drop-in Component</h2>
      <BunnyUpload
        accept={["image/*"]}
        maxSize="10mb"
        maxFiles={5}
        onComplete={(files) => setUploaded((prev) => [...prev, ...files])}
      />

      <hr style={{ margin: "40px 0" }} />

      <h2>Custom Dropzone</h2>
      <UploadDropzone
        accept={["image/*"]}
        maxSize="10mb"
        maxFiles={5}
        onComplete={(files) => console.log("Uploaded:", files)}
      >
        {({ isDragOver, openFilePicker, files, removeFile, getDropzoneProps, getInputProps }) => (
          <div>
            <div
              {...getDropzoneProps()}
              onClick={openFilePicker}
              style={{
                border: `2px dashed ${isDragOver ? "#f60" : "#ccc"}`,
                borderRadius: 8,
                padding: 40,
                textAlign: "center",
                cursor: "pointer",
                background: isDragOver ? "#fff8f0" : "transparent",
              }}
            >
              <input {...getInputProps()} />
              <p>{isDragOver ? "Drop to upload" : "Drag images here or click to browse"}</p>
            </div>

            {files.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
                {files.map((file) => (
                  <li key={file.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                    <span><strong>{file.name}</strong> {formatBytes(file.size)}</span>
                    <span>
                      {file.status === "uploading" && `${file.progress}%`}
                      {file.status === "complete" && "✓"}
                      {file.status === "error" && file.error}
                      {(file.status === "idle" || file.status === "error") && (
                        <button onClick={() => removeFile(file.id)}>×</button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </UploadDropzone>

      {uploaded.length > 0 && (
        <>
          <h2>Uploaded Files</h2>
          <ul>
            {uploaded.map((file) => (
              <li key={file.url}>
                <a href={file.url} target="_blank" rel="noreferrer">{file.name}</a>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
