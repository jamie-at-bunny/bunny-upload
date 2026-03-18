import { defineComponent, h, type PropType } from "vue";
import type { UploadResult, FileState } from "@bunny.net/upload-core";
import { BunnyUpload } from "./BunnyUpload";
import { useBunnyUpload, type UseBunnyUploadOptions } from "./use-bunny-upload";

export interface ConfigureOptions {
  endpoint?: string;
  accept?: string[];
  maxSize?: string | number;
  maxFiles?: number;
  onComplete?: (files: UploadResult[]) => void;
  onError?: (error: Error, file?: FileState) => void;
}

export function configureBunnyUpload(defaults: ConfigureOptions) {
  const ConfiguredBunnyUpload = defineComponent({
    name: "ConfiguredBunnyUpload",
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
      return () =>
        h(BunnyUpload, {
          endpoint: props.endpoint ?? defaults.endpoint,
          accept: props.accept ?? defaults.accept,
          maxSize: props.maxSize ?? defaults.maxSize,
          maxFiles: props.maxFiles ?? defaults.maxFiles,
          autoUpload: props.autoUpload,
          onComplete: (files: UploadResult[]) => emit("complete", files),
          onError: (error: Error) => emit("error", error),
        });
    },
  });

  function useConfiguredBunnyUpload(opts?: Partial<UseBunnyUploadOptions>) {
    return useBunnyUpload({
      ...defaults,
      ...opts,
    } as UseBunnyUploadOptions);
  }

  return {
    BunnyUpload: ConfiguredBunnyUpload,
    useBunnyUpload: useConfiguredBunnyUpload,
  };
}
