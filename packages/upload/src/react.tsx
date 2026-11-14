import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
// Imported by package name so the React build shares the client build
// (one UploadError class) instead of bundling its own copy.
import {
  upload as uploadFile,
  UploadError,
  type UploadOptions,
  type UploadResult,
} from "@bunny.net/upload/client";

export { UploadError } from "@bunny.net/upload/client";
export type { UploadResult } from "@bunny.net/upload/client";

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export interface UploadState {
  status: UploadStatus;
  /** 0–100 across every file in the current batch. */
  progress: number;
  results: UploadResult[];
  error: UploadError | null;
}

export interface UseUploadOptions extends Pick<UploadOptions, "endpoint" | "headers" | "retries"> {
  onComplete?: (results: UploadResult[]) => void;
  onError?: (error: UploadError) => void;
}

const initialState: UploadState = { status: "idle", progress: 0, results: [], error: null };

/**
 * Upload state for one batch of files.
 *
 * ```tsx
 * const { upload, status, progress, results } = useUpload();
 * <input type="file" onChange={(e) => upload(e.target.files!)} />
 * ```
 */
export function useUpload(options: UseUploadOptions = {}) {
  const [state, setState] = useState<UploadState>(initialState);
  const controller = useRef<AbortController | null>(null);
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => () => controller.current?.abort(), []);

  const upload = useCallback(async (input: File | File[] | FileList): Promise<UploadResult[]> => {
    const files = input instanceof File ? [input] : Array.from(input);
    if (files.length === 0) return [];

    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;

    const total = files.reduce((sum, f) => sum + f.size, 0) || 1;
    let finished = 0;
    const results: UploadResult[] = [];
    setState({ status: "uploading", progress: 0, results, error: null });

    try {
      for (const file of files) {
        const result = await uploadFile(file, {
          endpoint: latest.current.endpoint,
          headers: latest.current.headers,
          retries: latest.current.retries,
          signal: ctrl.signal,
          onProgress: ({ loaded }) =>
            setState((s) => ({ ...s, progress: Math.round(((finished + loaded) / total) * 100) })),
        });
        finished += file.size;
        results.push(result);
        setState((s) => ({ ...s, results: [...results] }));
      }
      setState({ status: "success", progress: 100, results, error: null });
      latest.current.onComplete?.(results);
      return results;
    } catch (err) {
      const error = err instanceof UploadError ? err : new UploadError("Upload failed");
      if (error.aborted) {
        // A newer batch or reset() replaced this one; leave its state alone.
        if (controller.current !== ctrl) return results;
        setState(initialState);
        return results;
      }
      setState({ status: "error", progress: 0, results, error });
      latest.current.onError?.(error);
      throw error;
    } finally {
      if (controller.current === ctrl) controller.current = null;
    }
  }, []);

  const abort = useCallback(() => controller.current?.abort(), []);

  const reset = useCallback(() => {
    const ctrl = controller.current;
    controller.current = null;
    ctrl?.abort();
    setState(initialState);
  }, []);

  return { ...state, isUploading: state.status === "uploading", upload, abort, reset };
}

export interface UploadButtonProps
  extends UseUploadOptions,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onError" | "type"> {
  /** Passed to the file input, e.g. `"image/*"`. Restrictions are enforced by the server. */
  accept?: string;
  multiple?: boolean;
  children?: ReactNode | ((state: UploadState) => ReactNode);
}

/**
 * An unstyled button that opens the file picker and uploads the selection.
 * Style it with `className` and the `data-status` attribute.
 */
export function UploadButton({
  endpoint,
  headers,
  retries,
  onComplete,
  onError,
  accept,
  multiple,
  children,
  disabled,
  ...buttonProps
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, abort, reset, ...state } = useUpload({
    endpoint,
    headers,
    retries,
    onComplete,
    onError,
  });

  const label =
    typeof children === "function"
      ? children(state)
      : children ??
        (isUploading
          ? `Uploading… ${state.progress}%`
          : multiple
            ? "Upload files"
            : "Upload file");

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(event) => {
          const files = event.currentTarget.files;
          if (files?.length) upload(Array.from(files)).catch(() => {});
          event.currentTarget.value = "";
        }}
      />
      <button
        type="button"
        {...buttonProps}
        disabled={disabled || isUploading}
        aria-busy={isUploading}
        data-status={state.status}
        onClick={(event) => {
          buttonProps.onClick?.(event);
          if (!event.defaultPrevented) inputRef.current?.click();
        }}
      >
        {label}
      </button>
    </>
  );
}
