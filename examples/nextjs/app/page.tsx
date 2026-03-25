"use client";

import { useState } from "react";
import {
  BunnyUpload,
  UploadWidget,
  UploadDropzone,
  UploadFileList,
  useBunnyUpload,
  formatBytes,
  type UploadResult,
} from "@bunny.net/upload-react";

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: "0 20px" }}>
      <h1>Bunny Upload — Next.js</h1>

      <Section title="Simple Button" description="Pick a file and see its name + upload status inline.">
        <BunnyUpload
          accept={["image/*"]}
          maxSize="10mb"
          onComplete={(files) => console.log("Uploaded:", files)}
        />
      </Section>

      <Section title="Upload Widget" description="A button that opens a modal with dropzone, file list, and progress.">
        <UploadWidget
          accept={["image/*"]}
          maxSize="10mb"
          maxFiles={5}
          onComplete={(files) => console.log("Uploaded:", files)}
        />
      </Section>

      <Section title="Upload Widget + File Manager" description="Upload new files or browse and select existing ones.">
        <UploadWidget
          accept={["image/*"]}
          maxSize="10mb"
          maxFiles={5}
          withFileManager
          onComplete={(files) => console.log("Selected:", files)}
        />
      </Section>

      <Section title="Custom Dropzone" description="Full control over the UI with render props.">
        <DropzoneExample />
      </Section>

      <Section title="Headless Hook" description="Maximum control — just the state and methods, zero UI from us.">
        <HookExample />
      </Section>
    </main>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2>{title}</h2>
      <p style={{ color: "#666", marginBottom: 16 }}>{description}</p>
      {children}
    </section>
  );
}

function DropzoneExample() {
  return (
    <UploadDropzone
      accept={["image/*"]}
      maxSize="10mb"
      maxFiles={5}
      onComplete={(files) => console.log("Uploaded:", files)}
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
                    {file.status === "uploading" && `${Math.round(file.progress)}%`}
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
        </div>
      )}
    </UploadDropzone>
  );
}

function HookExample() {
  const { files, addFiles, removeFile, upload, reset, isUploading } = useBunnyUpload({
    accept: ["image/*"],
    maxSize: "10mb",
    maxFiles: 5,
    onComplete: (files) => console.log("Uploaded:", files),
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ display: "inline-block", padding: "8px 16px", border: "1px solid #ccc", borderRadius: 4, cursor: "pointer" }}>
          Add files
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.length) {
                addFiles(e.target.files);
                e.target.value = "";
              }
            }}
            style={{ display: "none" }}
          />
        </label>
        <button onClick={() => upload()} disabled={isUploading || files.length === 0} style={{ padding: "8px 16px" }}>
          {isUploading ? "Uploading..." : "Upload"}
        </button>
        <button onClick={reset} disabled={files.length === 0} style={{ padding: "8px 16px" }}>
          Reset
        </button>
      </div>

      <UploadFileList files={files} onRemove={removeFile} onRetry={() => upload()} />
    </div>
  );
}
