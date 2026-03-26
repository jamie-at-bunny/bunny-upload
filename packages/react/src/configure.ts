import type { UploadResult, FileState } from "@bunny.net/upload-core";
import type { BunnyUploadLocale } from "@bunny.net/upload-shared";
import { BunnyUpload, type BunnyUploadProps } from "./bunny-upload";
import { useBunnyUpload, type UseBunnyUploadOptions } from "./use-bunny-upload";

export interface ConfigureOptions {
  endpoint?: string;
  accept?: string[];
  maxSize?: string | number;
  maxFiles?: number;
  onComplete?: (files: UploadResult[]) => void;
  onError?: (error: Error, file?: FileState) => void;
  /** Override user-facing strings for i18n */
  locale?: Partial<BunnyUploadLocale>;
}

export function configureBunnyUpload(defaults: ConfigureOptions) {
  function ConfiguredBunnyUpload(props: Partial<BunnyUploadProps>) {
    const mergedLocale = props.locale || defaults.locale
      ? { ...defaults.locale, ...props.locale }
      : undefined;
    return BunnyUpload({ ...defaults, ...props, locale: mergedLocale } as BunnyUploadProps);
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
