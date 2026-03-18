import {
  UploadError,
  type FileInfo,
  type HandlerOptions,
  type HandlerResponse,
  type UploadResult,
} from "./types";
import * as BunnyStorage from "@bunny.net/storage-sdk";

function parseFileSize(size: string | number): number {
  if (typeof size === "number") return size;
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  const match = size.toLowerCase().trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
  if (!match) throw new Error(`Invalid file size: "${size}"`);
  return Math.floor(parseFloat(match[1]) * units[match[2]]);
}

function matchesMimeType(fileType: string, pattern: string): boolean {
  if (pattern === "*" || pattern === "*/*") return true;
  if (pattern.endsWith("/*")) return fileType.startsWith(pattern.slice(0, -2) + "/");
  return fileType === pattern;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createBunnyUploadHandler(options: HandlerOptions = {}) {
  const storageZone = options.storageZone ?? process.env.BUNNY_STORAGE_ZONE;
  const storagePassword = options.storagePassword ?? process.env.BUNNY_STORAGE_PASSWORD;
  const cdnBase = options.cdnBase ?? process.env.BUNNY_CDN_BASE;
  const storageRegion = options.storageRegion ?? process.env.BUNNY_STORAGE_REGION;
  const { restrictions, onBeforeUpload, getPath, onAfterUpload } = options;

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

  return async function handler(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    try {
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

      // Validate restrictions
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

        // Validate file size
        if (restrictions?.maxFileSize) {
          const maxBytes = parseFileSize(restrictions.maxFileSize);
          if (file.size > maxBytes) {
            return jsonResponse(
              { error: `File "${file.name}" exceeds maximum size` },
              400
            );
          }
        }

        // Validate file type
        if (restrictions?.allowedTypes?.length) {
          const allowed = restrictions.allowedTypes.some((pattern) =>
            matchesMimeType(file.type, pattern)
          );
          if (!allowed) {
            return jsonResponse(
              { error: `File type "${file.type}" is not allowed` },
              400
            );
          }
        }

        // Run onBeforeUpload hook
        if (onBeforeUpload) {
          await onBeforeUpload(fileInfo, request);
        }

        // Determine storage path
        const path = getPath
          ? getPath(fileInfo, request)
          : `/${file.name}`;

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

        const cdnUrl = `${cdnBase.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

        const result: UploadResult = {
          name: file.name,
          path,
          size: file.size,
          url: cdnUrl,
        };

        // Run onAfterUpload hook
        if (onAfterUpload) {
          await onAfterUpload(result, request);
        }

        results.push(result);
      }

      const response: HandlerResponse = { files: results };
      return jsonResponse(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      const status = err instanceof UploadError ? err.statusCode : 500;
      return jsonResponse({ error: message }, status);
    }
  };
}
