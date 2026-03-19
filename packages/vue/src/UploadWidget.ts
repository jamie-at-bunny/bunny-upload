import {
  defineComponent,
  ref,
  computed,
  h,
  nextTick,
  watch,
  type PropType,
} from "vue";
import { formatBytes, type UploadResult } from "@bunny.net/upload-core";
import { useBunnyUpload } from "./use-bunny-upload";

export const UploadWidget = defineComponent({
  name: "UploadWidget",
  props: {
    endpoint: { type: String, default: undefined },
    accept: { type: Array as PropType<string[]>, default: undefined },
    maxSize: {
      type: [String, Number] as PropType<string | number>,
      default: undefined,
    },
    maxFiles: { type: Number, default: undefined },
    autoUpload: { type: Boolean, default: true },
    label: { type: String, default: "Upload files" },
  },
  emits: {
    complete: (_files: UploadResult[]) => true,
    error: (_error: Error) => true,
  },
  setup(props, { emit, slots }) {
    const isOpen = ref(false);
    const isDragOver = ref(false);
    const fileInputRef = ref<HTMLInputElement | null>(null);
    const dialogRef = ref<HTMLDialogElement | null>(null);

    const { files, addFiles, removeFile, upload, reset, isUploading } =
      useBunnyUpload({
        endpoint: props.endpoint,
        accept: props.accept,
        maxSize: props.maxSize,
        maxFiles: props.maxFiles,
        onComplete: (results) => emit("complete", results),
        onError: (error) => emit("error", error),
      });

    const allComplete = computed(
      () =>
        files.value.length > 0 &&
        files.value.every((f) => f.status === "complete")
    );

    function open() {
      isOpen.value = true;
    }

    function close() {
      isOpen.value = false;
      reset();
    }

    watch(isOpen, async (val) => {
      if (val) {
        await nextTick();
        dialogRef.value?.showModal();
      } else {
        dialogRef.value?.close();
      }
    });

    function handleFiles(fileList: FileList | File[]) {
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

    function onInputChange(e: Event) {
      const input = e.target as HTMLInputElement;
      if (input.files?.length) {
        handleFiles(input.files);
        input.value = "";
      }
    }

    return () => {
      const acceptString = props.accept?.join(",");

      const trigger = slots.trigger
        ? slots.trigger({ open })
        : h(
            "button",
            {
              type: "button",
              class: "bunny-widget-trigger",
              onClick: open,
            },
            props.label
          );

      const dialog = isOpen.value
        ? h(
            "dialog",
            {
              ref: dialogRef,
              class: "bunny-widget-dialog",
              onClose: close,
              onClick: (e: MouseEvent) => {
                if (e.target === dialogRef.value) close();
              },
            },
            [
              h("div", { class: "bunny-widget" }, [
                // Header
                h("div", { class: "bunny-widget-header" }, [
                  h("span", { class: "bunny-widget-title" }, props.label),
                  h(
                    "button",
                    {
                      type: "button",
                      class: "bunny-widget-close",
                      onClick: close,
                      "aria-label": "Close",
                    },
                    "\u00d7"
                  ),
                ]),

                // Dropzone
                h(
                  "div",
                  {
                    class: [
                      "bunny-widget-dropzone",
                      isDragOver.value && "bunny-widget-dropzone--active",
                    ],
                    onDrop,
                    onDragover: (e: DragEvent) => {
                      e.preventDefault();
                      isDragOver.value = true;
                    },
                    onDragleave: (e: DragEvent) => {
                      e.preventDefault();
                      isDragOver.value = false;
                    },
                    onClick: () => fileInputRef.value?.click(),
                    role: "button",
                    tabindex: 0,
                    onKeydown: (e: KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ")
                        fileInputRef.value?.click();
                    },
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
                    h(
                      "p",
                      { class: "bunny-widget-dropzone-text" },
                      isDragOver.value
                        ? "Drop to upload"
                        : "Drop files here or click to browse"
                    ),
                    props.maxSize != null &&
                      h(
                        "p",
                        { class: "bunny-widget-hint" },
                        `Max ${typeof props.maxSize === "string" ? props.maxSize : formatBytes(props.maxSize)}${props.maxFiles ? ` · ${props.maxFiles} file${props.maxFiles > 1 ? "s" : ""}` : ""}`
                      ),
                  ]
                ),

                // File list
                files.value.length > 0 &&
                  h(
                    "ul",
                    { class: "bunny-widget-file-list" },
                    files.value.map((file) =>
                      h(
                        "li",
                        {
                          key: file.id,
                          class: `bunny-widget-file bunny-widget-file--${file.status}`,
                        },
                        [
                          h(
                            "span",
                            { class: "bunny-widget-file-name" },
                            file.name
                          ),
                          h(
                            "span",
                            { class: "bunny-widget-file-size" },
                            formatBytes(file.size)
                          ),
                          file.status === "uploading" &&
                            h("div", { class: "bunny-widget-progress" }, [
                              h("div", {
                                class: "bunny-widget-progress-bar",
                                style: { width: `${file.progress}%` },
                              }),
                            ]),
                          file.status === "complete" &&
                            h(
                              "span",
                              { class: "bunny-widget-file-complete" },
                              "✓"
                            ),
                          file.status === "error" &&
                            h(
                              "span",
                              { class: "bunny-widget-file-error" },
                              file.error ?? "Failed"
                            ),
                          (file.status === "idle" ||
                            file.status === "error") &&
                            h(
                              "button",
                              {
                                class: "bunny-widget-file-remove",
                                onClick: () => removeFile(file.id),
                                "aria-label": `Remove ${file.name}`,
                              },
                              "\u00d7"
                            ),
                        ]
                      )
                    )
                  ),

                // Footer
                h("div", { class: "bunny-widget-footer" }, [
                  !props.autoUpload &&
                    files.value.some((f) => f.status === "idle") &&
                    h(
                      "button",
                      {
                        type: "button",
                        class: "bunny-widget-upload",
                        onClick: () => upload(),
                        disabled: isUploading.value,
                      },
                      isUploading.value ? "Uploading..." : "Upload"
                    ),
                  allComplete.value &&
                    h(
                      "button",
                      {
                        type: "button",
                        class: "bunny-widget-done",
                        onClick: close,
                      },
                      "Done"
                    ),
                ]),
              ]),
            ]
          )
        : null;

      return h("div", { style: { display: "contents" } }, [trigger, dialog]);
    };
  },
});
