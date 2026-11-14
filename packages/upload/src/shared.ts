/** A file that has been stored in Bunny Storage. */
export interface UploadResult {
  /** Original file name as picked by the user. */
  name: string;
  /** Path inside the storage zone, without a leading slash. */
  path: string;
  /** Size in bytes. */
  size: number;
  /** Content type the file was stored with. */
  type: string;
  /** Public CDN URL. */
  url: string;
}

/** What the client sends to start an upload. */
export interface InitRequest {
  action: "init";
  file: { name: string; size: number; type: string };
}

/** What the client sends after a presigned upload finishes. */
export interface CompleteRequest {
  action: "complete";
  token: string;
}

/** The server's answer to an init request. */
export type InitResponse =
  | { strategy: "proxy"; token: string }
  | {
      strategy: "presigned";
      token: string;
      uploadUrl: string;
      headers: Record<string, string>;
    };

/** Error body returned by the handler for any non-2xx response. */
export interface ErrorBody {
  error: string;
}

/** Header carrying the upload token when the file body is sent to the handler. */
export const TOKEN_HEADER = "x-bunny-upload-token";

export const DEFAULT_CONTENT_TYPE = "application/octet-stream";
