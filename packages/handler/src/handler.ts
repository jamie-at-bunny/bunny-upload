import {
  UploadError,
  type FileInfo,
  type HandlerOptions,
  type HandlerResponse,
  type UploadResult,
  type PresignRequest,
  type PresignResult,
  type PresignResponse,
  type CompleteRequest,
} from "./types";
import {
  parseFileSize,
  matchesMimeType,
  jsonResponse,
  signUploadToken,
  verifyUploadToken,
} from "@bunny.net/upload-shared";
import * as BunnyStorage from "@bunny.net/storage-sdk";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DEFAULT_TOKEN_EXPIRY_SECONDS = 3600;

const S3_REGIONS: Record<string, string> = {
  de: "de",
  ny: "ny",
  sg: "sg",
};

function buildS3Endpoint(region: string): string {
  const s3Region = S3_REGIONS[region];
  if (!s3Region) throw new Error(`Storage region "${region}" does not support S3. Supported regions: de, ny, sg`);
  return `https://${s3Region}-s3.storage.bunnycdn.com`;
}

function isPresignRequest(body: unknown): body is PresignRequest {
  return typeof body === "object" && body !== null && "presign" in body && (body as any).presign === true;
}

function isCompleteRequest(body: unknown): body is CompleteRequest {
  return typeof body === "object" && body !== null && "complete" in body && (body as any).complete === true;
}

function validateFileInfo(
  fileInfo: FileInfo,
  restrictions: HandlerOptions["restrictions"]
): string | null {
  if (restrictions?.maxFileSize) {
    const maxBytes = parseFileSize(restrictions.maxFileSize);
    if (fileInfo.size > maxBytes) {
      return `File "${fileInfo.name}" exceeds maximum size`;
    }
  }

  if (restrictions?.allowedTypes?.length) {
    const allowed = restrictions.allowedTypes.some((pattern) =>
      matchesMimeType(fileInfo.type, pattern)
    );
    if (!allowed) {
      return `File type "${fileInfo.type}" is not allowed`;
    }
  }

  return null;
}

export function createBunnyUploadHandler(options: HandlerOptions = {}) {
  const storageZone = options.storageZone ?? process.env.BUNNY_STORAGE_ZONE;
  const storagePassword = options.storagePassword ?? process.env.BUNNY_STORAGE_PASSWORD;
  const cdnBase = options.cdnBase ?? process.env.BUNNY_CDN_BASE;
  const storageRegion = options.storageRegion ?? process.env.BUNNY_STORAGE_REGION;
  const endpointUrl = options.endpointUrl ?? process.env.BUNNY_ENDPOINT_URL;
  const {
    restrictions,
    authorize,
    path: pathOption,
    onComplete,
    onBeforeUpload,
    getPath,
    onAfterUpload,
    tokenExpirySeconds = DEFAULT_TOKEN_EXPIRY_SECONDS,
    verifyUploadOnComplete = true,
  } = options;

  async function runAuthorize(file: FileInfo, request: Request): Promise<void> {
    if (authorize) {
      const result = await authorize({ request, file });
      if (result === false) {
        throw new UploadError("Unauthorized", 403);
      }
      return;
    }
    if (onBeforeUpload) {
      await onBeforeUpload(file, request);
    }
  }

  function resolvePath(file: FileInfo, request: Request): string {
    if (pathOption) return pathOption({ file, request });
    if (getPath) return getPath(file, request);
    return `/${file.name}`;
  }

  async function runOnComplete(
    result: UploadResult,
    request: Request
  ): Promise<void> {
    if (onComplete) {
      await onComplete({ file: result, request });
      return;
    }
    if (onAfterUpload) {
      await onAfterUpload(result, request);
    }
  }

  if (!storageZone) {
    throw new Error("Missing storageZone. Set it in options or via BUNNY_STORAGE_ZONE env var.");
  }
  if (!storagePassword) {
    throw new Error("Missing storagePassword. Set it in options or via BUNNY_STORAGE_PASSWORD env var.");
  }
  if (!cdnBase) {
    throw new Error("Missing cdnBase. Set it in options or via BUNNY_CDN_BASE env var.");
  }

  const region = (storageRegion ?? BunnyStorage.regions.StorageRegion.Falkenstein) as BunnyStorage.regions.StorageRegion;
  const sz = BunnyStorage.zone.connect_with_accesskey(region, storageZone, storagePassword);

  // Lazily create S3 client only when presigned URLs are requested
  let s3Client: S3Client | null = null;

  function getS3Client(): S3Client {
    if (!s3Client) {
      const regionCode = (storageRegion ?? "de") as string;
      const endpoint = endpointUrl ?? buildS3Endpoint(regionCode);
      s3Client = new S3Client({
        endpoint,
        region: regionCode,
        credentials: {
          accessKeyId: storageZone!,
          secretAccessKey: storagePassword!,
        },
        forcePathStyle: true,
        requestChecksumCalculation: "WHEN_REQUIRED",
      });
    }
    return s3Client;
  }

  function makeCdnUrl(path: string): string {
    return `${cdnBase!.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  }

  async function handlePresign(body: PresignRequest, request: Request): Promise<Response> {
    const { files: fileInfos } = body;

    if (!fileInfos || fileInfos.length === 0) {
      return jsonResponse({ error: "No files provided" }, 400);
    }

    if (restrictions?.maxFiles && fileInfos.length > restrictions.maxFiles) {
      return jsonResponse(
        { error: `Maximum of ${restrictions.maxFiles} files allowed` },
        400
      );
    }

    const results: PresignResult[] = [];
    const client = getS3Client();

    for (const fileInfo of fileInfos) {
      const validationError = validateFileInfo(fileInfo, restrictions);
      if (validationError) {
        return jsonResponse({ error: validationError }, 400);
      }

      await runAuthorize(fileInfo, request);

      const path = resolvePath(fileInfo, request);
      const key = path.replace(/^\//, "");

      const command = new PutObjectCommand({
        Bucket: storageZone,
        Key: key,
        ContentType: fileInfo.type,
        ContentLength: fileInfo.size,
      });

      const presignedUrl = await getSignedUrl(client, command, {
        expiresIn: 3600,
        signableHeaders: new Set(["content-type"]),
      });

      const token = await signUploadToken(
        {
          p: path,
          s: fileInfo.size,
          t: fileInfo.type,
          exp: Date.now() + tokenExpirySeconds * 1000,
        },
        storagePassword!
      );

      results.push({
        name: fileInfo.name,
        path,
        url: makeCdnUrl(path),
        presignedUrl,
        token,
      });
    }

    const response: PresignResponse = { files: results };
    return jsonResponse(response);
  }

  async function handleComplete(body: CompleteRequest, request: Request): Promise<Response> {
    const { files: completedFiles } = body;

    if (!completedFiles || completedFiles.length === 0) {
      return jsonResponse({ error: "No files provided" }, 400);
    }

    const results: UploadResult[] = [];

    for (const file of completedFiles) {
      if (!file.token || typeof file.token !== "string") {
        return jsonResponse({ error: "Missing upload token" }, 400);
      }

      const payload = await verifyUploadToken(file.token, storagePassword!);
      if (!payload) {
        return jsonResponse({ error: "Invalid upload token" }, 400);
      }
      if (payload.exp < Date.now()) {
        return jsonResponse({ error: "Upload token expired" }, 400);
      }
      if (payload.p !== file.path || payload.s !== file.size) {
        return jsonResponse({ error: "Upload token does not match file" }, 400);
      }

      if (verifyUploadOnComplete) {
        const key = payload.p.replace(/^\//, "");
        try {
          const head = await getS3Client().send(
            new HeadObjectCommand({ Bucket: storageZone, Key: key })
          );
          if (
            typeof head.ContentLength === "number" &&
            head.ContentLength !== payload.s
          ) {
            return jsonResponse({ error: "Uploaded file size mismatch" }, 400);
          }
        } catch {
          return jsonResponse(
            { error: "Uploaded file not found in storage" },
            400
          );
        }
      }

      const result: UploadResult = {
        name: file.name,
        path: payload.p,
        size: payload.s,
        url: makeCdnUrl(payload.p),
      };

      await runOnComplete(result, request);

      results.push(result);
    }

    const response: HandlerResponse = { files: results };
    return jsonResponse(response);
  }

  async function handleFormDataUpload(request: Request): Promise<Response> {
    const formData = await request.formData();
    const files: File[] = [];

    for (const [, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return jsonResponse({ error: "No files provided" }, 400);
    }

    if (restrictions?.maxFiles && files.length > restrictions.maxFiles) {
      return jsonResponse(
        { error: `Maximum of ${restrictions.maxFiles} files allowed` },
        400
      );
    }

    const results: UploadResult[] = [];

    for (const file of files) {
      const fileInfo: FileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
      };

      const validationError = validateFileInfo(fileInfo, restrictions);
      if (validationError) {
        return jsonResponse({ error: validationError }, 400);
      }

      await runAuthorize(fileInfo, request);

      const path = resolvePath(fileInfo, request);

      // Upload to Bunny Storage
      // TODO(@bunny.net/storage-sdk): The SDK types its stream parameter as
      // `import("stream/web").ReadableStream` which is incompatible with the
      // global `ReadableStream` that `File.stream()` returns. They're the same
      // at runtime — this cast can be removed once the SDK uses the global type.
      await BunnyStorage.file.upload(
        sz,
        path,
        file.stream() as any,
        { contentType: file.type }
      );

      const result: UploadResult = {
        name: file.name,
        path,
        size: file.size,
        url: makeCdnUrl(path),
      };

      await runOnComplete(result, request);

      results.push(result);
    }

    const response: HandlerResponse = { files: results };
    return jsonResponse(response);
  }

  return async function handler(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    try {
      const contentType = request.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const body = await request.json();

        if (isPresignRequest(body)) {
          return await handlePresign(body, request);
        }

        if (isCompleteRequest(body)) {
          return await handleComplete(body, request);
        }

        return jsonResponse({ error: "Invalid request" }, 400);
      }

      return await handleFormDataUpload(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      const status = err instanceof UploadError ? err.statusCode : 500;
      return jsonResponse({ error: message }, status);
    }
  };
}
