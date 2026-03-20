import {
  FileManagerError,
  type FileManagerHandlerOptions,
  type StorageEntry,
} from "./types";
import * as BunnyStorage from "@bunny.net/storage-sdk";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getStorageHost(region: string): string {
  if (region === "de") return "https://storage.bunnycdn.com";
  return `https://${region}.storage.bunnycdn.com`;
}

function normalizePath(path: string): string {
  // Ensure path starts with /
  if (!path.startsWith("/")) path = "/" + path;
  return path;
}

function stripZonePrefix(
  path: string,
  storageZoneName: string
): string {
  // The SDK returns paths like "/<storageZone>/subdir/" — strip the zone prefix
  // so the client works with clean paths like "/subdir/"
  const prefix = `/${storageZoneName}/`;
  if (path.startsWith(prefix)) {
    return "/" + path.slice(prefix.length);
  }
  const prefixAlt = `/${storageZoneName}`;
  if (path === prefixAlt) {
    return "/";
  }
  return path;
}

function toStorageEntry(
  file: BunnyStorage.file.StorageFile,
  storageZoneName: string
): StorageEntry {
  return {
    guid: file.guid,
    objectName: file.objectName,
    path: stripZonePrefix(file.path, storageZoneName),
    isDirectory: file.isDirectory,
    length: file.length,
    contentType: file.contentType,
    lastChanged: file.lastChanged.toISOString(),
    dateCreated: file.dateCreated.toISOString(),
    checksum: file.checksum,
  };
}

export function createFileManagerHandler(
  options: FileManagerHandlerOptions = {}
) {
  const storageZone = options.storageZone ?? process.env.BUNNY_STORAGE_ZONE;
  const storagePassword =
    options.storagePassword ?? process.env.BUNNY_STORAGE_PASSWORD;
  const cdnBase = options.cdnBase ?? process.env.BUNNY_CDN_BASE;
  const storageRegion = options.storageRegion ?? process.env.BUNNY_STORAGE_REGION;

  if (!storageZone) {
    throw new Error(
      "Missing storageZone. Set it in options or via BUNNY_STORAGE_ZONE env var."
    );
  }
  if (!storagePassword) {
    throw new Error(
      "Missing storagePassword. Set it in options or via BUNNY_STORAGE_PASSWORD env var."
    );
  }
  if (!cdnBase) {
    throw new Error(
      "Missing cdnBase. Set it in options or via BUNNY_CDN_BASE env var."
    );
  }

  const region = (storageRegion ??
    BunnyStorage.regions.StorageRegion
      .Falkenstein) as BunnyStorage.regions.StorageRegion;
  const sz = BunnyStorage.zone.connect_with_accesskey(
    region,
    storageZone,
    storagePassword
  );

  return async function handler(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.searchParams.get("path") ?? "/";
    const normalizedPath = normalizePath(path);

    try {
      switch (request.method) {
        case "GET": {
          const download = url.searchParams.get("download") === "true";

          if (download) {
            // Download a file
            if (options.onBeforeDownload) {
              await options.onBeforeDownload(normalizedPath, request);
            }

            const result = await BunnyStorage.file.download(
              sz,
              normalizedPath
            );

            const fileName = normalizedPath.split("/").pop() ?? "download";

            return new Response(result.stream as any, {
              status: 200,
              headers: {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename="${fileName}"`,
                ...(result.length
                  ? { "Content-Length": String(result.length) }
                  : {}),
              },
            });
          }

          // List directory
          if (options.onBeforeList) {
            await options.onBeforeList(normalizedPath, request);
          }

          const files = await BunnyStorage.file.list(sz, normalizedPath);
          const entries: StorageEntry[] = files.map((f) =>
            toStorageEntry(f, storageZone)
          );

          return jsonResponse({
            path: normalizedPath,
            entries,
            cdnBase: cdnBase.replace(/\/$/, ""),
          });
        }

        case "POST": {
          // Create folder
          const body = await request.json();
          const folderPath = body?.path;

          if (!folderPath || typeof folderPath !== "string") {
            return jsonResponse(
              { error: "Missing or invalid path in request body" },
              400
            );
          }

          const normalizedFolderPath = normalizePath(folderPath);

          if (options.onBeforeCreateFolder) {
            await options.onBeforeCreateFolder(normalizedFolderPath, request);
          }

          await BunnyStorage.file.createDirectory(sz, normalizedFolderPath);

          return jsonResponse({
            path: normalizedFolderPath,
            created: true,
          });
        }

        case "DELETE": {
          // Delete file or folder
          if (options.onBeforeDelete) {
            await options.onBeforeDelete(normalizedPath, request);
          }

          // Trailing slash = directory
          if (normalizedPath.endsWith("/")) {
            await BunnyStorage.file.removeDirectory(sz, normalizedPath);
          } else {
            await BunnyStorage.file.remove(sz, normalizedPath);
          }

          return jsonResponse({
            path: normalizedPath,
            deleted: true,
          });
        }

        case "PUT": {
          // Import file from URL
          const body = await request.json();
          const sourceUrl = body?.url;
          const destPath = body?.path;

          if (!sourceUrl || typeof sourceUrl !== "string") {
            return jsonResponse(
              { error: "Missing or invalid url in request body" },
              400
            );
          }
          if (!destPath || typeof destPath !== "string") {
            return jsonResponse(
              { error: "Missing or invalid path in request body" },
              400
            );
          }

          const normalizedDestPath = normalizePath(destPath);

          if (options.onBeforeImport) {
            await options.onBeforeImport(sourceUrl, normalizedDestPath, request);
          }

          // Normalize the source URL (handles spaces and special characters)
          let normalizedSourceUrl: string;
          try {
            normalizedSourceUrl = new URL(sourceUrl).href;
          } catch {
            return jsonResponse(
              { error: "Invalid source URL" },
              400
            );
          }

          // Call Bunny Storage's fetch-by-URL endpoint directly
          const storageHost = getStorageHost(region as string);
          // Decode first (in case client sent pre-encoded path), then re-encode each segment
          const decodedPath = decodeURIComponent(normalizedDestPath);
          const encodedPath = decodedPath
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/");
          const fetchUrl = `${storageHost}/${storageZone}${encodedPath}?url=${normalizedSourceUrl}`;

          console.log("[import-url] fetchUrl:", fetchUrl);

          const res = await fetch(fetchUrl, {
            method: "FETCH",
            headers: {
              AccessKey: storagePassword,
            },
          });

          if (!res.ok) {
            const text = await res.text();
            return jsonResponse(
              { error: `Import failed: ${text || res.statusText}` },
              res.status
            );
          }

          const cdnUrl = `${cdnBase.replace(/\/$/, "")}${normalizedDestPath}`;

          return jsonResponse({
            path: normalizedDestPath,
            imported: true,
            url: cdnUrl,
          });
        }

        default:
          return jsonResponse({ error: "Method not allowed" }, 405);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "File manager operation failed";
      const status =
        err instanceof FileManagerError ? err.statusCode : 500;
      return jsonResponse({ error: message }, status);
    }
  };
}
