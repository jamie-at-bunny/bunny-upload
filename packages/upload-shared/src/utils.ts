const SIZE_UNITS: Record<string, number> = {
  b: 1,
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
};

export function parseFileSize(size: string | number): number {
  if (typeof size === "number") return size;

  const match = size.toLowerCase().trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
  if (!match) {
    throw new Error(`Invalid file size format: "${size}". Use formats like "10mb", "1.5gb", "500kb".`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2];
  return Math.floor(value * SIZE_UNITS[unit]);
}

export function matchesMimeType(fileType: string, pattern: string): boolean {
  if (pattern === "*" || pattern === "*/*") return true;

  if (pattern.endsWith("/*")) {
    const category = pattern.slice(0, -2);
    return fileType.startsWith(category + "/");
  }

  return fileType === pattern;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
