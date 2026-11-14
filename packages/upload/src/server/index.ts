import { z } from "zod";
import {
  DEFAULT_CONTENT_TYPE,
  TOKEN_HEADER,
  type InitResponse,
  type UploadResult,
} from "../shared";
import { presignUrl } from "./sigv4";
import { signToken, verifyToken, type TokenPayload } from "./token";

export type { UploadResult, InitResponse } from "../shared";

// ─── Public types ──────────────────────────────────────────────────────────

/** File metadata declared by the client at init. */
export interface FileInfo {
  name: string;
  size: number;
  type: string;
}

export interface AuthorizeContext {
  file: FileInfo;
  request: Request;
}

export interface PathContext {
  file: FileInfo;
  request: Request;
}

export interface CompleteContext {
  file: UploadResult;
  request: Request;
}

export type StorageRegion = z.infer<typeof RegionSchema>;

export interface UploadHandlerOptions {
  /** Defaults to `BUNNY_STORAGE_ZONE`. */
  storageZone?: string;
  /** Storage zone password. Defaults to `BUNNY_STORAGE_PASSWORD`. */
  storagePassword?: string;
  /** Public CDN origin, e.g. `https://my-zone.b-cdn.net`. Defaults to `BUNNY_CDN_BASE`. */
  cdnBase?: string;
  /** Primary storage region. Defaults to `BUNNY_STORAGE_REGION`, then `"de"`. */
  region?: StorageRegion;

  /**
   * - `"proxy"` (default): the browser sends the file to this handler, which
   *   streams it to Bunny Storage. Works in every region, but the file passes
   *   through your server, so serverless body limits apply (4.5MB on Vercel).
   * - `"presigned"`: the browser uploads straight to Bunny's S3-compatible
   *   endpoint. Needs a zone with S3 enabled (regions de, ny, sg).
   */
  strategy?: "proxy" | "presigned";
  /** Override the S3 endpoint for presigned uploads. Defaults to `BUNNY_ENDPOINT_URL`. */
  endpointUrl?: string;

  /** Largest accepted file, as bytes or a string like `"10mb"`. */
  maxFileSize?: number | string;
  /** MIME patterns such as `"image/*"` or `"application/pdf"`. */
  allowedTypes?: string[];

  /** Return `false` (or throw an `UploadError`) to reject the upload. */
  authorize?: (ctx: AuthorizeContext) => boolean | void | Promise<boolean | void>;
  /**
   * Where to store the file inside the zone. Defaults to
   * `uploads/<uuid>-<sanitized name>`. `..` segments are rejected.
   */
  path?: (ctx: PathContext) => string | Promise<string>;
  /** Runs after the file is confirmed in storage, before the client gets a response. */
  onComplete?: (ctx: CompleteContext) => void | Promise<void>;

  /** HMAC secret for upload tokens. Defaults to `BUNNY_UPLOAD_SECRET`, then the storage password. */
  secret?: string;
  /** How long an upload may take from init to finish, in seconds. Defaults to 3600. */
  tokenTtl?: number;
}

export class UploadError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "UploadError";
  }
}

// ─── Validation ────────────────────────────────────────────────────────────

const RegionSchema = z.enum(["de", "uk", "ny", "la", "sg", "se", "br", "jh", "syd"]);
const S3_REGIONS = new Set<StorageRegion>(["de", "ny", "sg"]);

const SIZE_UNITS = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 } as const;

const SIZE_PATTERN = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/;

const FileSizeSchema = z.union(
  [
    z.number().int().positive(),
    z
      .string()
      .transform((value) => value.trim().toLowerCase())
      .pipe(z.string().regex(SIZE_PATTERN))
      .transform((value) => {
        const [, num, unit] = value.match(SIZE_PATTERN)!;
        return Math.floor(parseFloat(num) * SIZE_UNITS[unit as keyof typeof SIZE_UNITS]);
      }),
  ],
  { error: 'Use a number of bytes or a size like "10mb", "500kb" or "1.5gb"' }
);

const ConfigSchema = z
  .object({
    storageZone: z.string({ error: "Missing storageZone (or BUNNY_STORAGE_ZONE)" }).min(1),
    storagePassword: z
      .string({ error: "Missing storagePassword (or BUNNY_STORAGE_PASSWORD)" })
      .min(1),
    cdnBase: z.url({ error: "Missing or invalid cdnBase (or BUNNY_CDN_BASE)" }),
    region: RegionSchema.default("de"),
    strategy: z.enum(["proxy", "presigned"]).default("proxy"),
    endpointUrl: z.url().optional(),
    maxFileSize: FileSizeSchema.optional(),
    allowedTypes: z.array(z.string().min(1)).optional(),
    secret: z.string().min(1).optional(),
    tokenTtl: z.number().int().positive().default(3600),
  })
  .refine(
    (c) => c.strategy !== "presigned" || c.endpointUrl || S3_REGIONS.has(c.region),
    {
      message: 'Presigned uploads need an S3-enabled region ("de", "ny" or "sg") or an endpointUrl',
      path: ["region"],
    }
  );

const FileInfoSchema = z.object({
  name: z.string().trim().min(1, "File name is required").max(255, "File name is too long"),
  size: z.number().int().nonnegative(),
  type: z.string().max(255).default(""),
});

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("init"), file: FileInfoSchema }),
  z.object({ action: z.literal("complete"), token: z.string().min(1) }),
]);

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  const where = issue.path.length ? `${issue.path.join(".")}: ` : "";
  return `${where}${issue.message}`;
}

function readEnv(name: string): string | undefined {
  const value = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.[name];
  return value === "" ? undefined : value;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function matchesMimeType(type: string, pattern: string): boolean {
  if (pattern === "*" || pattern === "*/*") return true;
  if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
  return type === pattern;
}

function sanitizeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(-100);
  return clean || "file";
}

/** Strips leading slashes and rejects anything that could escape the zone. */
function normalizePath(path: string): string {
  const trimmed = path.replace(/^\/+/, "");
  const segments = trimmed.split("/");
  if (
    !trimmed ||
    trimmed.endsWith("/") ||
    trimmed.includes("\\") ||
    /[\u0000-\u001f]/.test(trimmed) ||
    segments.some((s) => s === "" || s === "." || s === "..")
  ) {
    throw new UploadError(`Invalid upload path "${path}"`, 500);
  }
  return trimmed;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Passes bytes through and fails if the total differs from `expected`. */
function exactLength(expected: number): TransformStream<Uint8Array, Uint8Array> {
  let seen = 0;
  return new TransformStream({
    transform(chunk, controller) {
      seen += chunk.byteLength;
      if (seen > expected) {
        controller.error(new UploadError("File is larger than declared", 413));
        return;
      }
      controller.enqueue(chunk);
    },
    flush(controller) {
      if (seen !== expected) {
        controller.error(new UploadError("File is smaller than declared", 400));
      }
    },
  });
}

// ─── Handler ───────────────────────────────────────────────────────────────

/**
 * Creates a `(request: Request) => Promise<Response>` upload endpoint.
 * Mount it on POST in any framework that speaks web `Request`/`Response`.
 */
export function createUploadHandler(options: UploadHandlerOptions = {}) {
  const parsed = ConfigSchema.safeParse({
    storageZone: options.storageZone ?? readEnv("BUNNY_STORAGE_ZONE"),
    storagePassword: options.storagePassword ?? readEnv("BUNNY_STORAGE_PASSWORD"),
    cdnBase: options.cdnBase ?? readEnv("BUNNY_CDN_BASE"),
    region: options.region ?? readEnv("BUNNY_STORAGE_REGION"),
    strategy: options.strategy,
    endpointUrl: options.endpointUrl ?? readEnv("BUNNY_ENDPOINT_URL"),
    maxFileSize: options.maxFileSize,
    allowedTypes: options.allowedTypes,
    secret: options.secret ?? readEnv("BUNNY_UPLOAD_SECRET"),
    tokenTtl: options.tokenTtl,
  });
  if (!parsed.success) {
    throw new Error(`[@bunny.net/upload] ${firstIssue(parsed.error)}`);
  }
  const config = parsed.data;
  const secret = config.secret ?? config.storagePassword;
  const cdnBase = config.cdnBase.replace(/\/+$/, "");
  const storageHost =
    config.region === "de" ? "storage.bunnycdn.com" : `${config.region}.storage.bunnycdn.com`;
  const s3Endpoint = config.endpointUrl ?? `https://${config.region}-s3.storage.bunnycdn.com`;

  const encodeKey = (path: string) => path.split("/").map(encodeURIComponent).join("/");

  const toResult = (p: TokenPayload): UploadResult => ({
    name: p.name,
    path: p.path,
    size: p.size,
    type: p.type,
    url: `${cdnBase}/${encodeKey(p.path)}`,
  });

  const presign = (method: "PUT" | "HEAD", p: TokenPayload) =>
    presignUrl({
      method,
      endpoint: s3Endpoint,
      bucket: config.storageZone,
      key: p.path,
      region: config.region,
      accessKeyId: config.storageZone,
      secretAccessKey: config.storagePassword,
      expiresIn: method === "PUT" ? config.tokenTtl : 60,
      headers:
        method === "PUT"
          ? { "content-type": p.type, "content-length": String(p.size) }
          : undefined,
    });

  async function readToken(token: string): Promise<TokenPayload> {
    const result = await verifyToken(token, secret);
    if (!result.ok) {
      throw new UploadError(
        result.reason === "expired" ? "Upload token expired" : "Invalid upload token",
        401
      );
    }
    return result.payload;
  }

  async function init(file: FileInfo, request: Request): Promise<Response> {
    const type = file.type || DEFAULT_CONTENT_TYPE;

    if (config.maxFileSize !== undefined && file.size > config.maxFileSize) {
      throw new UploadError(`"${file.name}" exceeds the maximum file size`, 413);
    }
    if (config.allowedTypes?.length && !config.allowedTypes.some((p) => matchesMimeType(type, p))) {
      throw new UploadError(`File type "${type}" is not allowed`, 415);
    }

    const info: FileInfo = { name: file.name, size: file.size, type };
    if (options.authorize && (await options.authorize({ file: info, request })) === false) {
      throw new UploadError("Unauthorized", 403);
    }

    const rawPath = options.path
      ? await options.path({ file: info, request })
      : `uploads/${crypto.randomUUID()}-${sanitizeName(file.name)}`;

    const payload: TokenPayload = {
      path: normalizePath(rawPath),
      name: file.name,
      size: file.size,
      type,
      exp: Date.now() + config.tokenTtl * 1000,
    };
    const token = await signToken(payload, secret);

    if (config.strategy === "proxy") {
      return json({ strategy: "proxy", token } satisfies InitResponse);
    }
    return json({
      strategy: "presigned",
      token,
      uploadUrl: await presign("PUT", payload),
      headers: { "content-type": type },
    } satisfies InitResponse);
  }

  async function finish(payload: TokenPayload, request: Request): Promise<Response> {
    const result = toResult(payload);
    await options.onComplete?.({ file: result, request });
    return json(result);
  }

  async function complete(token: string, request: Request): Promise<Response> {
    if (config.strategy !== "presigned") {
      throw new UploadError("This endpoint does not accept presigned uploads", 400);
    }
    const payload = await readToken(token);

    const head = await fetch(await presign("HEAD", payload), { method: "HEAD" });
    if (head.status === 404) throw new UploadError("Uploaded file not found in storage", 400);
    if (!head.ok) throw new UploadError("Could not verify upload with storage", 502);
    const length = head.headers.get("content-length");
    if (length !== null && Number(length) !== payload.size) {
      throw new UploadError("Uploaded file size does not match", 400);
    }

    return finish(payload, request);
  }

  async function proxy(token: string, request: Request): Promise<Response> {
    if (config.strategy !== "proxy") {
      throw new UploadError("Upload the file to the presigned URL instead", 400);
    }
    const payload = await readToken(token);

    const declared = request.headers.get("content-length");
    if (declared !== null && Number(declared) !== payload.size) {
      throw new UploadError("File size does not match the upload token", 400);
    }
    if (!request.body) throw new UploadError("Missing file body", 400);

    let streamError: unknown;
    const body = request.body.pipeThrough(exactLength(payload.size));
    const stored = await fetch(
      `https://${storageHost}/${encodeURIComponent(config.storageZone)}/${encodeKey(payload.path)}`,
      {
        method: "PUT",
        headers: {
          AccessKey: config.storagePassword,
          "Content-Type": DEFAULT_CONTENT_TYPE,
          "Override-Content-Type": payload.type,
        },
        body,
        // Required by Node/undici for streaming request bodies.
        duplex: "half",
      } as RequestInit
    ).catch((err) => {
      streamError = err;
      return null;
    });

    if (!stored) {
      const cause = (streamError as { cause?: unknown })?.cause ?? streamError;
      if (cause instanceof UploadError) throw cause;
      throw new UploadError("Could not reach Bunny Storage", 502);
    }
    if (!stored.ok) {
      throw new UploadError(`Bunny Storage rejected the upload (${stored.status})`, 502);
    }

    return finish(payload, request);
  }

  return async function handler(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    try {
      const token = request.headers.get(TOKEN_HEADER);
      if (token) return await proxy(token, request);

      let raw: unknown;
      try {
        raw = await request.json();
      } catch {
        throw new UploadError("Expected a JSON body", 400);
      }
      const body = BodySchema.safeParse(raw);
      if (!body.success) throw new UploadError(firstIssue(body.error), 400);

      return body.data.action === "init"
        ? await init(body.data.file, request)
        : await complete(body.data.token, request);
    } catch (err) {
      if (err instanceof UploadError) {
        return json({ error: err.message }, err.status);
      }
      console.error("[@bunny.net/upload] Unexpected error", err);
      return json({ error: "Upload failed" }, 500);
    }
  };
}
