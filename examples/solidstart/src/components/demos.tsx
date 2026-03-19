import {
  BunnyUpload,
  UploadWidget,
  UploadDropzone,
  UploadFileList,
  createBunnyUpload,
  formatBytes,
} from "@bunny.net/upload-solid";

export default function Demos() {
  return (
    <>
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

      <Section title="Custom Dropzone" description="Full control over the UI with render props.">
        <DropzoneExample />
      </Section>

      <Section title="Headless Primitive" description="Maximum control — just the state and methods, zero UI from us.">
        <PrimitiveExample />
      </Section>
    </>
  );
}

function Section(props: { title: string; description: string; children: any }) {
  return (
    <section style={{ "margin-top": "40px" }}>
      <h2>{props.title}</h2>
      <p style={{ color: "#666", "margin-bottom": "16px" }}>{props.description}</p>
      {props.children}
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
      {({ isDragOver, openFilePicker, files, removeFile, getDropzoneProps, getInputProps }) => {
        const dzProps = getDropzoneProps();
        const inProps = getInputProps();

        return (
          <div>
            <div
              onDrop={dzProps.onDrop}
              onDragOver={dzProps.onDragOver}
              onDragLeave={dzProps.onDragLeave}
              onClick={openFilePicker}
              style={{
                border: `2px dashed ${isDragOver() ? "#f60" : "#ccc"}`,
                "border-radius": "8px",
                padding: "40px",
                "text-align": "center",
                cursor: "pointer",
                background: isDragOver() ? "#fff8f0" : "transparent",
                transition: "all 0.2s",
              }}
            >
              <input
                ref={inProps.ref}
                type={inProps.type}
                multiple={inProps.multiple}
                accept={inProps.accept}
                onChange={inProps.onChange}
                style={inProps.style}
              />
              <p>{isDragOver() ? "Drop to upload" : "Drag images here or click to browse"}</p>
            </div>

            {files().length > 0 && (
              <ul style={{ "list-style": "none", padding: "0", "margin-top": "16px" }}>
                {files().map((file) => (
                  <li style={{
                    display: "flex",
                    "justify-content": "space-between",
                    "align-items": "center",
                    padding: "8px 0",
                    "border-bottom": "1px solid #eee",
                  }}>
                    <span>
                      <strong>{file.name}</strong>{" "}
                      <span style={{ color: "#888" }}>{formatBytes(file.size)}</span>
                    </span>
                    <span>
                      {file.status === "uploading" && `${Math.round(file.progress)}%`}
                      {file.status === "complete" && "✓"}
                      {file.status === "error" && (
                        <span style={{ color: "red" }}>{file.error}</span>
                      )}
                      {(file.status === "idle" || file.status === "error") && (
                        <button onClick={() => removeFile(file.id)} style={{ "margin-left": "8px", cursor: "pointer" }}>
                          ×
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }}
    </UploadDropzone>
  );
}

function PrimitiveExample() {
  const { files, addFiles, removeFile, upload, reset, isUploading } =
    createBunnyUpload({
      accept: ["image/*"],
      maxSize: "10mb",
      maxFiles: 5,
      onComplete: (results) => console.log("Uploaded:", results),
    });

  let inputRef!: HTMLInputElement;

  return (
    <div>
      <div style={{ display: "flex", gap: "8px" }}>
        <label style={{
          display: "inline-block",
          padding: "8px 16px",
          border: "1px solid #ccc",
          "border-radius": "4px",
          cursor: "pointer",
        }}>
          Add files
          <input
            ref={inputRef!}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              const input = e.target as HTMLInputElement;
              if (input.files?.length) {
                addFiles(input.files);
                input.value = "";
              }
            }}
            style={{ display: "none" }}
          />
        </label>
        <button
          onClick={() => upload()}
          disabled={isUploading() || files().length === 0}
          style={{ padding: "8px 16px" }}
        >
          {isUploading() ? "Uploading..." : "Upload"}
        </button>
        <button
          onClick={reset}
          disabled={files().length === 0}
          style={{ padding: "8px 16px" }}
        >
          Reset
        </button>
      </div>

      <UploadFileList
        files={files()}
        onRemove={removeFile}
        onRetry={() => upload()}
      />
    </div>
  );
}
