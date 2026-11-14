export interface UploadTokenPayload {
  /** Storage path the upload is bound to. */
  p: string;
  /** Declared file size in bytes. */
  s: number;
  /** Declared content type. */
  t: string;
  /** Expiry as ms since epoch. */
  exp: number;
}

function b64urlEncode(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input: string): Uint8Array | null {
  try {
    const padLen = (4 - (input.length % 4)) % 4;
    const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
    const decoded = atob(padded);
    const out = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) out[i] = decoded.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signUploadToken(
  payload: UploadTokenPayload,
  secret: string
): Promise<string> {
  const key = await importKey(secret);
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
  return `${b64urlEncode(data)}.${b64urlEncode(sig)}`;
}

export async function verifyUploadToken(
  token: string,
  secret: string
): Promise<UploadTokenPayload | null> {
  const dot = token.indexOf(".");
  if (dot < 0) return null;

  const bodyB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  const data = b64urlDecode(bodyB64);
  const sig = b64urlDecode(sigB64);
  if (!data || !sig) return null;

  const key = await importKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sig as unknown as BufferSource,
    data as unknown as BufferSource
  );
  if (!valid) return null;

  try {
    const parsed = JSON.parse(new TextDecoder().decode(data));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.p !== "string" ||
      typeof parsed.s !== "number" ||
      typeof parsed.t !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    return parsed as UploadTokenPayload;
  } catch {
    return null;
  }
}
