import { createFileRoute } from "@tanstack/react-router";
import { BunnyUpload } from "@bunny-upload/react";
import type { UploadResult } from "@bunny-upload/core";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [uploaded, setUploaded] = useState<UploadResult[]>([]);

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
      <h1>Bunny Upload — TanStack Start</h1>
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
