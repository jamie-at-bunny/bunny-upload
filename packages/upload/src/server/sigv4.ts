/**
 * Minimal AWS Signature V4 query-string presigning on top of WebCrypto,
 * so the handler runs on any runtime without pulling in the AWS SDK.
 */

export interface PresignInput {
  method: "PUT" | "HEAD" | "GET";
  /** S3 endpoint origin, e.g. https://de-s3.storage.bunnycdn.com */
  endpoint: string;
  bucket: string;
  /** Object key without a leading slash. */
  key: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresIn: number;
  /** Headers the uploader must send verbatim (lowercase names). */
  headers?: Record<string, string>;
  /** Extra query parameters to include in the signature. */
  query?: Record<string, string>;
  /** Defaults to now; injectable for tests. */
  date?: Date;
}

const encoder = new TextEncoder();

/** RFC 3986 encoding as required by SigV4. */
function encode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

async function sha256Hex(data: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(data)));
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

export async function presignUrl(input: PresignInput): Promise<string> {
  const date = input.date ?? new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const shortDate = amzDate.slice(0, 8);
  const scope = `${shortDate}/${input.region}/s3/aws4_request`;

  const url = new URL(input.endpoint);
  const canonicalPath =
    "/" + [input.bucket, ...input.key.split("/")].map(encode).join("/");

  const headers: Record<string, string> = { host: url.host };
  for (const [name, value] of Object.entries(input.headers ?? {})) {
    headers[name.toLowerCase()] = value.trim();
  }
  const headerNames = Object.keys(headers).sort();
  const signedHeaders = headerNames.join(";");

  const query: Record<string, string> = {
    ...input.query,
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
    "X-Amz-Credential": `${input.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(input.expiresIn),
    "X-Amz-SignedHeaders": signedHeaders,
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encode(k)}=${encode(query[k])}`)
    .join("&");

  const canonicalRequest = [
    input.method,
    canonicalPath,
    canonicalQuery,
    headerNames.map((h) => `${h}:${headers[h]}\n`).join(""),
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  let key: ArrayBuffer = await hmac(
    encoder.encode(`AWS4${input.secretAccessKey}`),
    shortDate
  );
  for (const part of [input.region, "s3", "aws4_request"]) {
    key = await hmac(key, part);
  }
  const signature = toHex(await hmac(key, stringToSign));

  return `${url.origin}${canonicalPath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
