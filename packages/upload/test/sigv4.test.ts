import { describe, expect, it } from "vitest";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { presignUrl } from "../src/server/sigv4";

const date = new Date("2026-11-14T12:34:56Z");
const creds = { accessKeyId: "my-zone", secretAccessKey: "s3cr3t-pass" };

const sdk = new S3Client({
  endpoint: "https://de-s3.storage.bunnycdn.com",
  region: "de",
  credentials: creds,
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
});

function params(url: string) {
  const u = new URL(url);
  return { path: u.pathname, query: Object.fromEntries(u.searchParams) };
}

describe("presignUrl", () => {
  it("matches the AWS SDK for a PUT that signs content-type and content-length", async () => {
    const key = "uploads/a b/ünï+code(1).png";
    const expected = await getSignedUrl(
      sdk,
      new PutObjectCommand({ Bucket: "my-zone", Key: key, ContentType: "image/png", ContentLength: 1234 }),
      { expiresIn: 600, signingDate: date, signableHeaders: new Set(["content-type", "content-length"]) }
    );

    const ours = await presignUrl({
      method: "PUT",
      endpoint: "https://de-s3.storage.bunnycdn.com",
      bucket: "my-zone",
      key,
      region: "de",
      ...creds,
      expiresIn: 600,
      headers: { "content-type": "image/png", "content-length": "1234" },
      query: { "x-id": "PutObject" },
      date,
    });

    const e = params(expected);
    const o = params(ours);
    expect(e.query["X-Amz-SignedHeaders"]).toBe("content-length;content-type;host");
    expect(o.path).toBe(e.path);
    expect(o.query).toEqual(e.query);
  });

  it("matches the AWS SDK for a HEAD", async () => {
    const expected = await getSignedUrl(
      sdk,
      new HeadObjectCommand({ Bucket: "my-zone", Key: "uploads/file.txt" }),
      { expiresIn: 60, signingDate: date }
    );
    const ours = await presignUrl({
      method: "HEAD",
      endpoint: "https://de-s3.storage.bunnycdn.com",
      bucket: "my-zone",
      key: "uploads/file.txt",
      region: "de",
      ...creds,
      expiresIn: 60,
      date,
    });
    expect(params(ours)).toEqual(params(expected));
  });
});
