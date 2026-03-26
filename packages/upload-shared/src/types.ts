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
