import { createHmac, timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function verifyHmacSha256(rawBody: string, secret: string, received: string | null) {
  if (!received) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompare(received, expected) || safeCompare(received, `sha256=${expected}`);
}

export function verifyHmacSha384(rawBody: string, secret: string, received: string | null) {
  if (!received) return false;
  const expected = createHmac("sha384", secret).update(rawBody).digest("hex");
  return safeCompare(received, expected) || safeCompare(received, `sha384:${expected}`);
}
