import { defineComponent, ref, h, type PropType } from "vue";
import { formatBytes, type UploadResult } from "@bunny.net/upload-core";
import { useBunnyUpload } from "./use-bunny-upload";

export const BunnyUpload = defineComponent({
  name: "BunnyUpload",
  props: {
    endpoint: { type: String, default: undefined },
    accept: { type: Array as PropType<string[]>, default: undefined },
    maxSize: {
      type: [String, Number] as PropType<string | number>,
      default: undefined,
    },
    maxFiles: { type: Number, default: undefined },
    autoUpload: { type: Boolean, default: true },
    label: { type: String, default: "Choose file" },
  },
  emits: {
    complete: (_files: UploadResult[]) => true,
    error: (_error: Error) => true,
  },
  setup(props, { emit }) {
    const fileInputRef = ref<HTMLInputElement | null>(null);

    const { files, addFiles, upload, isUploading } = useBunnyUpload({
      endpoint: props.endpoint,
      accept: props.accept,
      maxSize: props.maxSize,
      maxFiles: props.maxFiles,
      onComplete: (results) => emit("complete", results),
      onError: (error) => emit("error", error),
    });

    function handleFiles(fileList: FileList | File[]) {
      addFiles(fileList);
      if (props.autoUpload) {
        queueMicrotask(() => upload());
      }
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

    return () => {
      const acceptString = props.accept?.join(",");
      const latestFile =
        files.value.length > 0
          ? files.value[files.value.length - 1]
          : null;

      return h("div", { class: "bunny-upload" }, [
        h(
          "button",
          {
            type: "button",
            class: "bunny-upload-button",
            onClick,
            disabled: isUploading.value,
          },
          props.label
        ),
        h("input", {
          ref: fileInputRef,
          type: "file",
          multiple: props.maxFiles !== 1,
          accept: acceptString,
          onChange: onInputChange,
          style: { display: "none" },
        }),
        latestFile &&
          h("span", { class: "bunny-upload-status" }, [
            h(
              "span",
              { class: "bunny-upload-filename" },
              latestFile.name
            ),
            latestFile.status === "uploading" &&
              h(
                "span",
                { class: "bunny-upload-progress" },
                `${Math.round(latestFile.progress)}%`
              ),
            latestFile.status === "complete" &&
              h("span", { class: "bunny-upload-complete" }, "Uploaded"),
            latestFile.status === "error" &&
              h(
                "span",
                { class: "bunny-upload-error" },
                latestFile.error ?? "Failed"
              ),
            latestFile.status === "idle" &&
              h(
                "span",
                { class: "bunny-upload-size" },
                formatBytes(latestFile.size)
              ),
          ]),
        files.value.length > 1 &&
          h(
            "span",
            { class: "bunny-upload-count" },
            `+${files.value.length - 1} more`
          ),
      ]);
    };
  },
});
