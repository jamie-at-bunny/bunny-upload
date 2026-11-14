export interface Restrictions {
  maxFileSize?: string | number;
  allowedTypes?: string[];
  maxFiles?: number;
}

export interface UploadResult {
  name: string;
  path: string;
  size: number;
  url: string;
}

export interface PresignResult {
  name: string;
  path: string;
  url: string;
  presignedUrl: string;
  /**
   * Short-lived HMAC token binding this upload's path/size/contentType.
   * The client must echo this back in the complete request so the server
   * can verify the upload was authorized and the metadata wasn't tampered.
   */
  token: string;
}

export interface PresignResponse {
  files: PresignResult[];
}

export class HandlerError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
  }
}
