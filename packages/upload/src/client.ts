import {
  DEFAULT_CONTENT_TYPE,
  TOKEN_HEADER,
  type InitResponse,
  type UploadResult,
} from "./shared";

export type { UploadResult } from "./shared";

export const DEFAULT_ENDPOINT = "/api/upload";

export interface UploadProgress {
  loaded: number;
  total: number;
  /** 0–100 */
  percent: number;
}

export interface UploadOptions {
  /** Your upload handler's URL. Defaults to `/api/upload`. */
  endpoint?: string;
  /** Extra headers for requests to your handler (e.g. `Authorization`). */
  headers?: Record<string, string>;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
  /** Retries for network errors and 5xx responses while sending bytes. Defaults to 2. */
  retries?: number;
}

export class UploadError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 for network errors and aborts. */
    readonly status = 0
  ) {
    super(message);
    this.name = "UploadError";
  }

  get aborted(): boolean {
    return this.name === "AbortError";
  }
}

function abortError(): UploadError {
  const err = new UploadError("Upload aborted");
  err.name = "AbortError";
  return err;
}

async function errorFrom(response: Response): Promise<UploadError> {
  const body = await response.json().catch(() => null);
  const message =
    typeof body?.error === "string" ? body.error : `Request failed with status ${response.status}`;
  return new UploadError(message, response.status);
}

async function postJson<T>(endpoint: string, body: unknown, options: UploadOptions): Promise<T> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { ...options.headers, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch {
    if (options.signal?.aborted) throw abortError();
    throw new UploadError("Network error");
  }
  if (!response.ok) throw await errorFrom(response);
  return response.json() as Promise<T>;
}

/** Sends bytes with XHR, because fetch can't report upload progress everywhere. */
function send(
  method: "POST" | "PUT",
  url: string,
  file: Blob,
  headers: Record<string, string>,
  options: UploadOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) return reject(abortError());

    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    options.signal?.addEventListener("abort", onAbort, { once: true });
    const done = () => options.signal?.removeEventListener("abort", onAbort);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      options.onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percent: Math.round((event.loaded / event.total) * 100),
      });
    };
    xhr.onload = () => {
      done();
      if (xhr.status >= 200 && xhr.status < 300) return resolve(xhr.responseText);
      let message = `Upload failed with status ${xhr.status}`;
      try {
        const body = JSON.parse(xhr.responseText);
        if (typeof body?.error === "string") message = body.error;
      } catch {}
      reject(new UploadError(message, xhr.status));
    };
    xhr.onerror = () => {
      done();
      reject(new UploadError("Network error during upload"));
    };
    xhr.onabort = () => {
      done();
      reject(abortError());
    };

    xhr.open(method, url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.send(file);
  });
}

async function withRetry<T>(fn: () => Promise<T>, retries: number, signal?: AbortSignal): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable =
        err instanceof UploadError && !err.aborted && (err.status === 0 || err.status >= 500);
      if (!retryable || attempt >= retries || signal?.aborted) throw err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
}

/**
 * Upload one file through your handler and resolve with its CDN URL.
 *
 * ```ts
 * const { url } = await upload(file, { onProgress: (p) => console.log(p.percent) });
 * ```
 */
export async function upload(file: File, options: UploadOptions = {}): Promise<UploadResult> {
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const type = file.type || DEFAULT_CONTENT_TYPE;
  const retries = options.retries ?? 2;

  const init = await postJson<InitResponse>(
    endpoint,
    { action: "init", file: { name: file.name, size: file.size, type } },
    options
  );

  if (init.strategy === "proxy") {
    const text = await withRetry(
      () =>
        send(
          "POST",
          endpoint,
          file,
          { ...options.headers, "content-type": type, [TOKEN_HEADER]: init.token },
          options
        ),
      retries,
      options.signal
    );
    return JSON.parse(text) as UploadResult;
  }

  await withRetry(
    () => send("PUT", init.uploadUrl, file, init.headers, options),
    retries,
    options.signal
  );
  return postJson<UploadResult>(endpoint, { action: "complete", token: init.token }, options);
}
