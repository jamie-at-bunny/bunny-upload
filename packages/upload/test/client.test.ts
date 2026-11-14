import { afterEach, describe, expect, it, vi } from "vitest";
import { upload, UploadError } from "../src/client";
import { TOKEN_HEADER } from "../src/shared";

type Reply = { status: number; body?: unknown } | "network-error" | "hang";

/** Minimal XMLHttpRequest stand-in that replays scripted responses. */
function installXhr(replies: Reply[]) {
  const sent: { method: string; url: string; headers: Record<string, string> }[] = [];

  class FakeXHR {
    upload: { onprogress?: (e: ProgressEvent) => void } = {};
    onload?: () => void;
    onerror?: () => void;
    onabort?: () => void;
    status = 0;
    responseText = "";
    private method = "";
    private url = "";
    private headers: Record<string, string> = {};

    open(method: string, url: string) {
      this.method = method;
      this.url = url;
    }
    setRequestHeader(name: string, value: string) {
      this.headers[name] = value;
    }
    abort() {
      queueMicrotask(() => this.onabort?.());
    }
    send(body: Blob) {
      sent.push({ method: this.method, url: this.url, headers: this.headers });
      const reply = replies.shift() ?? { status: 500 };
      if (reply === "hang") return;
      queueMicrotask(() => {
        if (reply === "network-error") return this.onerror?.();
        this.upload.onprogress?.({ lengthComputable: true, loaded: body.size, total: body.size } as ProgressEvent);
        this.status = reply.status;
        this.responseText = JSON.stringify(reply.body ?? {});
        this.onload?.();
      });
    }
  }

  vi.stubGlobal("XMLHttpRequest", FakeXHR);
  return sent;
}

function installFetch(...responses: [number, unknown][]) {
  const fn = vi.fn(async () => {
    const [status, body] = responses.shift() ?? [500, {}];
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const file = new File(["hello"], "hello.txt", { type: "text/plain" });
const result = { name: "hello.txt", path: "uploads/x-hello.txt", size: 5, type: "text/plain", url: "https://cdn/x" };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("upload()", () => {
  it("proxy: sends the file to the handler with the token and reports progress", async () => {
    const fetchMock = installFetch([200, { strategy: "proxy", token: "tok" }]);
    const sent = installXhr([{ status: 200, body: result }]);
    const onProgress = vi.fn();

    await expect(upload(file, { endpoint: "/up", onProgress, headers: { authorization: "Bearer x" } })).resolves.toEqual(result);

    const init = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(init).toEqual({ action: "init", file: { name: "hello.txt", size: 5, type: "text/plain" } });
    expect(sent[0]).toMatchObject({
      method: "POST",
      url: "/up",
      headers: { [TOKEN_HEADER]: "tok", authorization: "Bearer x", "content-type": "text/plain" },
    });
    expect(onProgress).toHaveBeenCalledWith({ loaded: 5, total: 5, percent: 100 });
  });

  it("presigned: PUTs to storage without app headers, then completes", async () => {
    const fetchMock = installFetch(
      [200, { strategy: "presigned", token: "tok", uploadUrl: "https://s3/put", headers: { "content-type": "text/plain" } }],
      [200, result]
    );
    const sent = installXhr([{ status: 200 }]);

    await expect(upload(file, { headers: { authorization: "Bearer x" } })).resolves.toEqual(result);
    expect(sent[0]).toEqual({ method: "PUT", url: "https://s3/put", headers: { "content-type": "text/plain" } });
    const complete = JSON.parse((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body as string);
    expect(complete).toEqual({ action: "complete", token: "tok" });
    expect((fetchMock.mock.calls[1] as unknown as [string])[0]).toBe("/api/upload");
  });

  it("surfaces the server's error message from init without uploading", async () => {
    installFetch([413, { error: '"hello.txt" exceeds the maximum file size' }]);
    const sent = installXhr([]);
    const err = await upload(file).catch((e) => e);
    expect(err).toBeInstanceOf(UploadError);
    expect(err).toMatchObject({ status: 413, message: '"hello.txt" exceeds the maximum file size' });
    expect(sent).toHaveLength(0);
  });

  it("does not retry 4xx, retries 5xx and network errors", async () => {
    vi.useFakeTimers();
    installFetch([200, { strategy: "proxy", token: "t" }]);
    const sent4xx = installXhr([{ status: 401, body: { error: "Upload token expired" } }]);
    await expect(upload(file)).rejects.toMatchObject({ status: 401, message: "Upload token expired" });
    expect(sent4xx).toHaveLength(1);

    installFetch([200, { strategy: "proxy", token: "t" }]);
    const sent = installXhr(["network-error", { status: 503 }, { status: 200, body: result }]);
    const pending = upload(file);
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual(result);
    expect(sent).toHaveLength(3);
  });

  it("aborts via AbortSignal", async () => {
    installFetch([200, { strategy: "proxy", token: "t" }]);
    installXhr(["hang"]);
    const ctrl = new AbortController();
    const pending = upload(file, { signal: ctrl.signal });
    await new Promise((r) => setTimeout(r, 0));
    ctrl.abort();
    const err = await pending.catch((e) => e);
    expect(err).toBeInstanceOf(UploadError);
    expect(err.aborted).toBe(true);
  });
});
