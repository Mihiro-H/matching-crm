import { createHmac } from "node:crypto";
import { describe, expect, test } from "vitest";
import {
  computeZoomChallengeResponse,
  verifySharedSecret,
  verifySlackSignature,
} from "./verify-signature";

describe("verifySlackSignature", () => {
  const signingSecret = "test-signing-secret";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = '{"type":"event_callback"}';

  function sign(secret: string, ts: string, body: string): string {
    const base = `v0:${ts}:${body}`;
    return `v0=${createHmac("sha256", secret).update(base).digest("hex")}`;
  }

  test("accepts a correctly signed request", () => {
    const signature = sign(signingSecret, timestamp, rawBody);
    expect(verifySlackSignature(signingSecret, timestamp, rawBody, signature)).toBe(true);
  });

  test("rejects a signature computed with the wrong secret", () => {
    const signature = sign("wrong-secret", timestamp, rawBody);
    expect(verifySlackSignature(signingSecret, timestamp, rawBody, signature)).toBe(false);
  });

  test("rejects a tampered body", () => {
    const signature = sign(signingSecret, timestamp, rawBody);
    expect(verifySlackSignature(signingSecret, timestamp, '{"type":"tampered"}', signature)).toBe(
      false
    );
  });

  test("rejects a timestamp older than 5 minutes (replay protection)", () => {
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 6 * 60).toString();
    const signature = sign(signingSecret, oldTimestamp, rawBody);
    expect(verifySlackSignature(signingSecret, oldTimestamp, rawBody, signature)).toBe(false);
  });
});

describe("computeZoomChallengeResponse", () => {
  test("computes an HMAC-SHA256 hex digest of the plainToken using the secret token", () => {
    const secretToken = "zoom-secret";
    const plainToken = "abc123";
    const expected = createHmac("sha256", secretToken).update(plainToken).digest("hex");
    expect(computeZoomChallengeResponse(secretToken, plainToken)).toBe(expected);
  });
});

describe("verifySharedSecret", () => {
  test("returns true when the provided secret matches", () => {
    expect(verifySharedSecret("expected-secret", "expected-secret")).toBe(true);
  });

  test("returns false when the provided secret does not match", () => {
    expect(verifySharedSecret("expected-secret", "wrong")).toBe(false);
  });

  test("returns false when no secret is provided", () => {
    expect(verifySharedSecret("expected-secret", null)).toBe(false);
  });

  test("returns false when secrets differ only in length (no crash)", () => {
    expect(verifySharedSecret("expected-secret", "short")).toBe(false);
  });
});
