"use client";

import { useState } from "react";
import {
  BunnyUpload,
  UploadWidget,
  UploadFileList,
  useBunnyUpload,
  defaultLocale,
  type BunnyUploadLocale,
} from "@bunny.net/upload-react";
import { de } from "./locales/de";
import { es } from "./locales/es";
import { ja } from "./locales/ja";

const locales: Record<string, { label: string; locale: BunnyUploadLocale }> = {
  en: { label: "English", locale: defaultLocale },
  de: { label: "Deutsch", locale: de },
  es: { label: "Español", locale: es },
  ja: { label: "日本語", locale: ja },
};

export default function Home() {
  const [lang, setLang] = useState("en");
  const current = locales[lang].locale;

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: "0 20px" }}>
      <h1>Bunny Upload — i18n</h1>
      <p style={{ color: "#666" }}>
        Switch languages to see all component strings update.
      </p>

      <div style={{ display: "flex", gap: 8, margin: "24px 0" }}>
        {Object.entries(locales).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setLang(key)}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: lang === key ? "2px solid #f60" : "1px solid #ccc",
              background: lang === key ? "#fff8f0" : "white",
              cursor: "pointer",
              fontWeight: lang === key ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <Section
        title="Simple Button"
        description="The button label, status text, and overflow count are all localized."
      >
        <BunnyUpload
          accept={["image/*"]}
          maxSize="10mb"
          locale={current}
          onComplete={(files) => console.log("Uploaded:", files)}
        />
      </Section>

      <Section
        title="Upload Widget"
        description="Dropzone text, tab labels, progress labels, buttons, and ARIA labels."
      >
        <UploadWidget
          accept={["image/*"]}
          maxSize="10mb"
          maxFiles={5}
          locale={current}
          onComplete={(files) => console.log("Uploaded:", files)}
        />
      </Section>

      <Section
        title="Upload Widget + File Manager"
        description="Browse tab, file manager strings, selection count, and folder prompts."
      >
        <UploadWidget
          accept={["image/*"]}
          maxSize="10mb"
          maxFiles={5}
          withFileManager
          locale={current}
          onComplete={(files) => console.log("Selected:", files)}
        />
      </Section>

      <Section
        title="Partial Override"
        description="You can override just a few strings instead of providing a full locale."
      >
        <UploadWidget
          accept={["image/*"]}
          maxSize="10mb"
          locale={{
            uploadFiles: "Upload photos",
            dropOrBrowse: "Drag your photos here",
            dropToUpload: "Release to upload photos",
            done: "All done!",
          }}
          onComplete={(files) => console.log("Uploaded:", files)}
        />
      </Section>

      <Section
        title="Headless Hook + UploadFileList"
        description="Locale is passed to UploadFileList for status text and ARIA labels."
      >
        <HookExample locale={current} />
      </Section>
    </main>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2>{title}</h2>
      <p style={{ color: "#666", marginBottom: 16 }}>{description}</p>
      {children}
    </section>
  );
}

function HookExample({ locale }: { locale: BunnyUploadLocale }) {
  const { files, addFiles, removeFile, upload, reset, isUploading } =
    useBunnyUpload({
      accept: ["image/*"],
      maxSize: "10mb",
      maxFiles: 5,
      onComplete: (files) => console.log("Uploaded:", files),
    });

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <label
          style={{
            display: "inline-block",
            padding: "8px 16px",
            border: "1px solid #ccc",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          {locale.chooseFile}
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
        <button
          onClick={() => upload()}
          disabled={isUploading || files.length === 0}
          style={{ padding: "8px 16px" }}
        >
          {isUploading ? locale.uploading : locale.upload}
        </button>
        <button
          onClick={reset}
          disabled={files.length === 0}
          style={{ padding: "8px 16px" }}
        >
          Reset
        </button>
      </div>

      <UploadFileList
        files={files}
        onRemove={removeFile}
        onRetry={() => upload()}
        locale={locale}
      />
    </div>
  );
}
