import { defineComponent, h, type PropType } from "vue";
import { formatBytes, type FileState } from "@bunny.net/upload-core";

export const UploadFileList = defineComponent({
  name: "UploadFileList",
  props: {
    files: {
      type: Array as PropType<FileState[]>,
      required: true,
    },
  },
  emits: {
    remove: (_id: string) => true,
    retry: () => true,
  },
  setup(props, { emit }) {
    return () => {
      if (props.files.length === 0) return null;

      return h(
        "ul",
        { class: "bunny-upload-file-list" },
        props.files.map((file) =>
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
                      onClick: () => emit("retry"),
                    },
                    "Retry"
                  ),
                ]),

              file.status === "complete" &&
                h("span", { class: "bunny-upload-file-complete" }, "Uploaded"),

              (file.status === "idle" || file.status === "error") &&
                h(
                  "button",
                  {
                    class: "bunny-upload-remove",
                    onClick: () => emit("remove", file.id),
                    "aria-label": `Remove ${file.name}`,
                  },
                  "\u00d7"
                ),
            ]
          )
        )
      );
    };
  },
});
