import { defineComponent, ref, h, type PropType, type SetupContext } from "vue";
import type { UploadResult, FileState } from "@bunny.net/upload-core";
import { useBunnyUpload } from "./use-bunny-upload";

export const UploadDropzone = defineComponent({
  name: "UploadDropzone",
  props: {
    endpoint: { type: String, default: undefined },
    accept: { type: Array as PropType<string[]>, default: undefined },
    maxSize: {
      type: [String, Number] as PropType<string | number>,
      default: undefined,
    },
    maxFiles: { type: Number, default: undefined },
    autoUpload: { type: Boolean, default: true },
  },
  emits: {
    complete: (_files: UploadResult[]) => true,
    error: (_error: Error) => true,
  },
  setup(props, { emit, slots }: SetupContext) {
    const fileInputRef = ref<HTMLInputElement | null>(null);
    const isDragOver = ref(false);

    const { files, addFiles, removeFile, upload, reset, isUploading } =
      useBunnyUpload({
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

    function openFilePicker() {
      fileInputRef.value?.click();
    }

    function getDropzoneProps() {
      return {
        onDrop: (e: DragEvent) => {
          e.preventDefault();
          isDragOver.value = false;
          if (e.dataTransfer?.files.length) {
            handleFiles(e.dataTransfer.files);
          }
        },
        onDragover: (e: DragEvent) => {
          e.preventDefault();
          isDragOver.value = true;
        },
        onDragleave: (e: DragEvent) => {
          e.preventDefault();
          isDragOver.value = false;
        },
      };
    }

    function getInputProps() {
      return {
        ref: fileInputRef,
        type: "file",
        multiple: props.maxFiles !== 1,
        accept: props.accept?.join(","),
        onChange: (e: Event) => {
          const input = e.target as HTMLInputElement;
          if (input.files?.length) {
            handleFiles(input.files);
            input.value = "";
          }
        },
        style: { display: "none" },
      };
    }

    return () => {
      const slotProps = {
        isDragOver: isDragOver.value,
        openFilePicker,
        files: files.value,
        removeFile,
        upload,
        reset,
        isUploading: isUploading.value,
        getDropzoneProps,
        getInputProps,
      };

      // Render the hidden file input + the slot content
      return h("div", { style: { display: "contents" } }, [
        h("input", getInputProps()),
        slots.default?.(slotProps),
      ]);
    };
  },
});
