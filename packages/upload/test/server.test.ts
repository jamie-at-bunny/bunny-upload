import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUploadHandler, type UploadHandlerOptions } from "../src/server";
import { signToken } from "../src/server/token";
import { TOKEN_HEADER } from "../src/shared";

const base = {
  storageZone: "my-zone",
  storagePassword: "pass",
  cdnBase: "https://my-zone.b-cdn.net/",
} satisfies UploadHandlerOptions;

const URL_ = "https://app.test/api/upload";

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(URL_, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function init(file = { name: "photo.png", size: 5, type: "image/png" }) {
  return post({ action: "init", file });
}

function proxyBody(token: string, bytes: Uint8Array) {
  return new Request(URL_, {
    method: "POST",
    headers: { [TOKEN_HEADER]: token, "content-type": "image/png" },
    body: bytes as BodyInit,
  });
}

/** Fake Bunny Storage that drains the streamed body like a real server would. */
function mockStorage(status = 201) {
  const calls: { url: string; init: RequestInit; bytes: number }[] = [];
  const fetchMock = vi.fn(async (url: string | URL, init: RequestInit = {}) => {
    let bytes = 0;
    if (init.body instanceof ReadableStream) {
      const reader = init.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
        }
      } catch (err) {
        throw new TypeError("fetch failed", { cause: err });
      }
    }
    calls.push({ url: String(url), init, bytes });
    return new Response(null, { status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("configuration", () => {
  it("reads credentials from env", () => {
    vi.stubEnv("BUNNY_STORAGE_ZONE", "z");
    vi.stubEnv("BUNNY_STORAGE_PASSWORD", "p");
    vi.stubEnv("BUNNY_CDN_BASE", "https://z.b-cdn.net");
    expect(() => createUploadHandler()).not.toThrow();
  });

  it("fails fast with a readable message", () => {
    vi.stubEnv("BUNNY_STORAGE_ZONE", "");
    expect(() => createUploadHandler({ ...base, storageZone: undefined })).toThrow(/storageZone/);
    expect(() => createUploadHandler({ ...base, maxFileSize: "ten megs" })).toThrow(/10mb/);
    expect(() => createUploadHandler({ ...base, region: "la", strategy: "presigned" })).toThrow(
      /S3-enabled region/
    );
  });
});

describe("init", () => {
  it("rejects malformed bodies with a 400 from the schema", async () => {
    const handler = createUploadHandler(base);
    const res = await handler(post({ action: "init", file: { name: "", size: -1 } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/^file\./);

    const bad = await handler(new Request(URL_, { method: "POST", body: "not json" }));
    expect(bad.status).toBe(400);
  });

  it("only accepts POST", async () => {
    const res = await createUploadHandler(base)(new Request(URL_));
    expect(res.status).toBe(405);
  });

  it("enforces size and type", async () => {
    const handler = createUploadHandler({ ...base, maxFileSize: "1kb", allowedTypes: ["image/*"] });
    expect((await handler(init({ name: "a.png", size: 2048, type: "image/png" }))).status).toBe(413);
    expect((await handler(init({ name: "a.pdf", size: 10, type: "application/pdf" }))).status).toBe(415);
    expect((await handler(init({ name: "a.png", size: 1024, type: "image/png" }))).status).toBe(200);
  });

  it("returns 403 when authorize returns false (not an unhandled 500)", async () => {
    const handler = createUploadHandler({ ...base, authorize: () => false });
    const res = await handler(init());
    expect(res.status).toBe(403);
  });

  it("hides unexpected errors behind a 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = createUploadHandler({
      ...base,
      authorize: () => {
        throw new Error("db password is hunter2");
      },
    });
    const res = await handler(init());
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("hunter2");
    spy.mockRestore();
  });

  it("rejects custom paths that escape the zone", async () => {
    for (const path of ["../etc/passwd", "a/../../b", "a//b", "dir/"]) {
      const handler = createUploadHandler({ ...base, path: () => path });
      expect((await handler(init())).status).toBe(500);
    }
  });

  it("returns a presigned URL that signs size and type", async () => {
    const handler = createUploadHandler({ ...base, strategy: "presigned" });
    const body = await (await handler(init())).json();
    expect(body.strategy).toBe("presigned");
    expect(body.headers).toEqual({ "content-type": "image/png" });
    const url = new URL(body.uploadUrl);
    expect(url.host).toBe("de-s3.storage.bunnycdn.com");
    expect(url.pathname).toMatch(/^\/my-zone\/uploads\/[0-9a-f-]{36}-photo\.png$/);
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toBe("content-length;content-type;host");
  });
});

describe("proxy upload", () => {
  let calls: ReturnType<typeof mockStorage>;
  beforeEach(() => {
    calls = mockStorage();
  });

  it("streams the file to Bunny Storage and returns the CDN URL", async () => {
    const onComplete = vi.fn();
    const handler = createUploadHandler({ ...base, region: "ny", onComplete, path: () => "/avatars/me 1.png" });

    const { strategy, token } = await (await handler(init())).json();
    expect(strategy).toBe("proxy");

    const res = await handler(proxyBody(token, new Uint8Array(5)));
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result).toEqual({
      name: "photo.png",
      path: "avatars/me 1.png",
      size: 5,
      type: "image/png",
      url: "https://my-zone.b-cdn.net/avatars/me%201.png",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://ny.storage.bunnycdn.com/my-zone/avatars/me%201.png");
    expect(calls[0].bytes).toBe(5);
    expect((calls[0].init.headers as Record<string, string>)["Override-Content-Type"]).toBe("image/png");
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ file: result }));
  });

  it("rejects bodies larger than the token allows", async () => {
    const handler = createUploadHandler(base);
    const { token } = await (await handler(init())).json();
    const res = await handler(proxyBody(token, new Uint8Array(50)));
    expect(res.status).toBe(413);
    expect(calls).toHaveLength(0);
  });

  it("rejects a Content-Length that differs from the token", async () => {
    const handler = createUploadHandler(base);
    const { token } = await (await handler(init())).json();
    const req = proxyBody(token, new Uint8Array(5));
    req.headers.set("content-length", "6");
    expect((await handler(req)).status).toBe(400);
  });

  it("aborts the storage upload when a chunked body overruns", async () => {
    const handler = createUploadHandler(base);
    const { token } = await (await handler(init())).json();
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(4));
        c.enqueue(new Uint8Array(4));
        c.close();
      },
    });
    const req = new Request(URL_, {
      method: "POST",
      headers: { [TOKEN_HEADER]: token },
      body: stream,
      duplex: "half",
    } as RequestInit);
    const res = await handler(req);
    expect(res.status).toBe(413);
    expect(calls).toHaveLength(0);
  });

  it("rejects forged and expired tokens", async () => {
    const handler = createUploadHandler(base);
    const forged = await signToken(
      { path: "x", name: "x", size: 5, type: "image/png", exp: Date.now() + 1000 },
      "wrong-secret"
    );
    expect((await handler(proxyBody(forged, new Uint8Array(5)))).status).toBe(401);

    const expired = await signToken(
      { path: "x", name: "x", size: 5, type: "image/png", exp: Date.now() - 1 },
      "pass"
    );
    const res = await handler(proxyBody(expired, new Uint8Array(5)));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/expired/);
  });

  it("reports storage failures as 502", async () => {
    mockStorage(401);
    const handler = createUploadHandler(base);
    const { token } = await (await handler(init())).json();
    expect((await handler(proxyBody(token, new Uint8Array(5)))).status).toBe(502);
  });
});

describe("presigned complete", () => {
  it("HEADs the object, then fires onComplete with server-trusted data", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(null, { status: 200, headers: { "content-length": "5" } })
    );
    vi.stubGlobal("fetch", fetchMock);
    const onComplete = vi.fn();
    const handler = createUploadHandler({ ...base, strategy: "presigned", onComplete });

    const { token } = await (await handler(init())).json();
    const res = await handler(post({ action: "complete", token }));
    expect(res.status).toBe(200);
    expect((await res.json()).size).toBe(5);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("-s3.storage.bunnycdn.com"), {
      method: "HEAD",
    });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("refuses to complete when the stored size differs or the file is missing", async () => {
    const handler = createUploadHandler({ ...base, strategy: "presigned" });
    const { token } = await (await handler(init())).json();

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { headers: { "content-length": "999" } })));
    expect((await handler(post({ action: "complete", token }))).status).toBe(400);

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    expect((await handler(post({ action: "complete", token }))).status).toBe(400);
  });

  it("does not accept a proxy body when configured for presigned", async () => {
    const handler = createUploadHandler({ ...base, strategy: "presigned" });
    const { token } = await (await handler(init())).json();
    expect((await handler(proxyBody(token, new Uint8Array(5)))).status).toBe(400);
  });
});
