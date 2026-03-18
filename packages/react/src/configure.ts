import type { UploadResult, FileState } from "@bunny.net/upload-core";
import { BunnyUpload, type BunnyUploadProps } from "./bunny-upload";
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
  function ConfiguredBunnyUpload(props: Partial<BunnyUploadProps>) {
    return BunnyUpload({ ...defaults, ...props } as BunnyUploadProps);
  }

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
