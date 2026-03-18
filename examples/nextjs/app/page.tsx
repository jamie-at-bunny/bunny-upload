"use client";

import { BunnyUpload, useBunnyUpload } from "@bunny-upload/react";

export default function Home() {
  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
      <h1>Bunny Upload — Next.js Example</h1>
      <p>Drop files below to upload them to Bunny Storage.</p>

      <BunnyUpload
        accept={["image/*"]}
        maxSize="10mb"
        maxFiles={5}
        onComplete={(files) => {
          console.log(
            "Uploaded:",
            files.map((f) => f.url)
          );
        }}
      />

      <hr style={{ margin: "40px 0" }} />

      <h2>Headless Hook Example</h2>
      <HeadlessExample />
    </main>
  );
}

function HeadlessExample() {
  const { files, addFiles, upload, reset, isUploading } = useBunnyUpload({
    accept: ["image/*"],
    maxSize: "10mb",
  });

  return (
    <div>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
        }}
      />
      <button onClick={() => upload()} disabled={isUploading}>
        {isUploading ? "Uploading..." : "Upload"}
      </button>
      <button onClick={reset}>Reset</button>
      <ul>
        {files.map((f) => (
          <li key={f.id}>
            {f.name} — {f.status} {f.progress > 0 && `(${f.progress}%)`}
          </li>
        ))}
      </ul>
    </div>
  );
}
