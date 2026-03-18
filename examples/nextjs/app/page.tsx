"use client";

import { useState } from "react";
import {
  BunnyUpload,
  UploadDropzone,
  formatBytes,
  type UploadResult,
} from "@bunny.net/upload-react";

export default function Home() {
  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
      <h1>Bunny Upload — Next.js Example</h1>

      <h2>Drop-in Component</h2>
      <p>Everything built in — drop zone, file list, progress bars.</p>
      <BunnyUpload
        accept={["image/*"]}
        maxSize="10mb"
        maxFiles={5}
        onComplete={(files) => console.log("Uploaded:", files.map((f) => f.url))}
      />

      <hr style={{ margin: "40px 0" }} />

      <h2>Custom Dropzone</h2>
      <p>Full control over the UI with render props.</p>
      <DropzoneExample />
    </main>
  );
}

function DropzoneExample() {
  const [uploaded, setUploaded] = useState<UploadResult[]>([]);

  return (
    <>
      <UploadDropzone
        accept={["image/*"]}
        maxSize="10mb"
        maxFiles={5}
        onComplete={(files) => setUploaded((prev) => [...prev, ...files])}
      >
        {({ isDragOver, openFilePicker, files, removeFile, isUploading, getDropzoneProps, getInputProps }) => (
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
                transition: "all 0.2s",
              }}
            >
              <input {...getInputProps()} />
              <p>{isDragOver ? "Drop to upload" : "Drag images here or click to browse"}</p>
            </div>

            {files.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
                {files.map((file) => (
                  <li key={file.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #eee" }}>
                    <span>
                      <strong>{file.name}</strong>{" "}
                      <span style={{ color: "#888" }}>{formatBytes(file.size)}</span>
                    </span>
                    <span>
                      {file.status === "uploading" && `${file.progress}%`}
                      {file.status === "complete" && "✓"}
                      {file.status === "error" && <span style={{ color: "red" }}>{file.error}</span>}
                      {(file.status === "idle" || file.status === "error") && (
                        <button onClick={() => removeFile(file.id)} style={{ marginLeft: 8, cursor: "pointer" }}>×</button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {isUploading && <p style={{ color: "#f60", marginTop: 8 }}>Uploading...</p>}
          </div>
        )}
      </UploadDropzone>

      {uploaded.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>Uploaded</h3>
          <ul>
            {uploaded.map((file) => (
              <li key={file.url}>
                <a href={file.url} target="_blank" rel="noreferrer">{file.name}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
