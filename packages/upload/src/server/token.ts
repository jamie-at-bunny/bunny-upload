import { z } from "zod";

/**
 * Short-lived HMAC token issued at init. It binds an upload to the path, size,
 * type and name the server approved, so later steps never trust the client.
 */
export const TokenPayloadSchema = z.object({
  path: z.string(),
  name: z.string(),
  size: z.number().int().nonnegative(),
  type: z.string(),
  /** Expiry in ms since epoch. */
  exp: z.number(),
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

const encoder = new TextEncoder();

function b64urlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input: string): Uint8Array | null {
  try {
    const padded =
      input.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (input.length % 4)) % 4);
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signToken(payload: TokenPayload, secret: string): Promise<string> {
  const data = encoder.encode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("HMAC", await importKey(secret), data);
  return `${b64urlEncode(data)}.${b64urlEncode(new Uint8Array(sig))}`;
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: "invalid" | "expired" };

export async function verifyToken(token: string, secret: string): Promise<VerifyResult> {
  const [body, sig, ...rest] = token.split(".");
  if (!body || !sig || rest.length) return { ok: false, reason: "invalid" };

  const data = b64urlDecode(body);
  const signature = b64urlDecode(sig);
  if (!data || !signature) return { ok: false, reason: "invalid" };

  const valid = await crypto.subtle.verify(
    "HMAC",
    await importKey(secret),
    signature as BufferSource,
    data as BufferSource
  );
  if (!valid) return { ok: false, reason: "invalid" };

  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(data));
  } catch {
    return { ok: false, reason: "invalid" };
  }
  const parsed = TokenPayloadSchema.safeParse(json);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  if (parsed.data.exp < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, payload: parsed.data };
}
