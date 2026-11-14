"use client";

import { useState } from "react";
import { UploadButton, type UploadResult } from "@bunny.net/upload/react";

export default function Page() {
  const [files, setFiles] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <main>
      <h1>Upload to Bunny</h1>

      <UploadButton
        accept="image/*"
        multiple
        onComplete={(results) => {
          setError(null);
          setFiles((prev) => [...results, ...prev]);
        }}
        onError={(err) => setError(err.message)}
      />

      {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}

      <ul>
        {files.map((file) => (
          <li key={file.path}>
            <a href={file.url} target="_blank" rel="noreferrer">{file.name}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
