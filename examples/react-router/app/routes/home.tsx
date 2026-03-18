import { BunnyUpload } from "@bunny.net/upload-react";
import type { UploadResult } from "@bunny.net/upload-core";
import { useState } from "react";

export default function Home() {
  const [uploaded, setUploaded] = useState<UploadResult[]>([]);

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
      <h1>Bunny Upload — React Router</h1>
      <p>Drop files below to upload them to Bunny Storage.</p>

      <BunnyUpload
        accept={["image/*"]}
        maxSize="10mb"
        maxFiles={5}
        onComplete={(files) => setUploaded((prev) => [...prev, ...files])}
      />

      {uploaded.length > 0 && (
        <>
          <h2>Uploaded Files</h2>
          <ul>
            {uploaded.map((file) => (
              <li key={file.url}>
                {file.name} — {file.url}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
