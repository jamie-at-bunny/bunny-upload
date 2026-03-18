import { defineComponent, ref, h, type PropType } from "vue";
import { formatBytes, type UploadResult } from "@bunny.net/upload-core";
import { useBunnyUpload } from "./use-bunny-upload";

export const BunnyUpload = defineComponent({
  name: "BunnyUpload",
  props: {
    endpoint: { type: String, default: undefined },
    accept: { type: Array as PropType<string[]>, default: undefined },
    maxSize: { type: [String, Number] as PropType<string | number>, default: undefined },
    maxFiles: { type: Number, default: undefined },
    autoUpload: { type: Boolean, default: true },
  },
  emits: {
    complete: (_files: UploadResult[]) => true,
    error: (_error: Error) => true,
  },
  setup(props, { emit }) {
    const fileInputRef = ref<HTMLInputElement | null>(null);
    const isDragOver = ref(false);

    const { files, addFiles, removeFile, upload, isUploading } = useBunnyUpload({
      endpoint: props.endpoint,
      accept: props.accept,
      maxSize: props.maxSize,
      maxFiles: props.maxFiles,
      onComplete: (results) => emit("complete", results),
      onError: (error) => emit("error", error),
    });

    async function handleFiles(fileList: FileList | File[]) {
      addFiles(fileList);
      if (props.autoUpload) {
        queueMicrotask(() => upload());
      }
    }

    function onDrop(e: DragEvent) {
      e.preventDefault();
      isDragOver.value = false;
      if (e.dataTransfer?.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    }

    function onDragOver(e: DragEvent) {
      e.preventDefault();
      isDragOver.value = true;
    }

    function onDragLeave(e: DragEvent) {
      e.preventDefault();
      isDragOver.value = false;
    }

    function onClick() {
      fileInputRef.value?.click();
    }

    function onInputChange(e: Event) {
      const input = e.target as HTMLInputElement;
      if (input.files?.length) {
        handleFiles(input.files);
        input.value = "";
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") onClick();
    }

    return () => {
      const acceptString = props.accept?.join(",");

      return h("div", { class: "bunny-upload" }, [
        // Dropzone
        h(
          "div",
          {
            class: [
              "bunny-upload-dropzone",
              isDragOver.value && "bunny-upload-dropzone--active",
            ],
            onDrop: onDrop,
            onDragover: onDragOver,
            onDragleave: onDragLeave,
            onClick: onClick,
            onKeydown: onKeyDown,
            role: "button",
            tabindex: 0,
          },
          [
            h("input", {
              ref: fileInputRef,
              type: "file",
              multiple: props.maxFiles !== 1,
              accept: acceptString,
              onChange: onInputChange,
              style: { display: "none" },
            }),
            h("div", { class: "bunny-upload-dropzone-text" }, [
              h("p", null, "Drop files here or click to browse"),
              props.maxSize != null &&
                h(
                  "p",
                  { class: "bunny-upload-hint" },
                  `Max size: ${typeof props.maxSize === "string" ? props.maxSize : formatBytes(props.maxSize)}`
                ),
            ]),
          ]
        ),

        // File list
        files.value.length > 0 &&
          h(
            "ul",
            { class: "bunny-upload-file-list" },
            files.value.map((file) =>
              h(
                "li",
                {
                  key: file.id,
                  class: `bunny-upload-file bunny-upload-file--${file.status}`,
                },
                [
                  h("div", { class: "bunny-upload-file-info" }, [
                    h("span", { class: "bunny-upload-file-name" }, file.name),
                    h(
                      "span",
                      { class: "bunny-upload-file-size" },
                      formatBytes(file.size)
                    ),
                  ]),

                  file.status === "uploading" &&
                    h("div", { class: "bunny-upload-progress" }, [
                      h("div", {
                        class: "bunny-upload-progress-bar",
                        style: { width: `${file.progress}%` },
                      }),
                    ]),

                  file.status === "error" &&
                    h("div", { class: "bunny-upload-file-error" }, [
                      h("span", null, file.error),
                      h(
                        "button",
                        {
                          class: "bunny-upload-retry",
                          onClick: () => upload(),
                        },
                        "Retry"
                      ),
                    ]),

                  file.status === "complete" &&
                    h(
                      "span",
                      { class: "bunny-upload-file-complete" },
                      "Uploaded"
                    ),

                  (file.status === "idle" || file.status === "error") &&
                    h(
                      "button",
                      {
                        class: "bunny-upload-remove",
                        onClick: () => removeFile(file.id),
                        "aria-label": `Remove ${file.name}`,
                      },
                      "\u00d7"
                    ),
                ]
              )
            )
          ),

        // Upload button (manual mode)
        !props.autoUpload &&
          files.value.some((f) => f.status === "idle") &&
          h(
            "button",
            {
              class: "bunny-upload-button",
              onClick: () => upload(),
              disabled: isUploading.value,
            },
            isUploading.value ? "Uploading..." : "Upload"
          ),
      ]);
    };
  },
});
