import type { UploadResult, FileState } from "@bunny.net/upload-core";
import { BunnyUpload, type BunnyUploadProps } from "./BunnyUpload";
import {
  createBunnyUpload,
  type CreateBunnyUploadOptions,
} from "./create-bunny-upload";

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

  function useConfiguredBunnyUpload(opts?: Partial<CreateBunnyUploadOptions>) {
    return createBunnyUpload({
      ...defaults,
      ...opts,
    } as CreateBunnyUploadOptions);
  }

  return {
    BunnyUpload: ConfiguredBunnyUpload,
    createBunnyUpload: useConfiguredBunnyUpload,
  };
}
