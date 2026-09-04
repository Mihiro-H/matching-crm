import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, test } from "vitest";
import { createSignedJwt, normalizePrivateKey } from "./jwt";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}

describe("createSignedJwt", () => {
  test("builds a RS256 JWT with the expected header and claims", () => {
    const jwt = createSignedJwt({
      clientEmail: "test@example.iam.gserviceaccount.com",
      privateKeyPem: privateKey,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      audience: "https://oauth2.googleapis.com/token",
      issuedAtSeconds: 1_000_000,
    });

    const [headerB64, payloadB64] = jwt.split(".");
    expect(decodeSegment(headerB64)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decodeSegment(payloadB64)).toEqual({
      iss: "test@example.iam.gserviceaccount.com",
      scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: 1_000_000,
      exp: 1_000_000 + 3600,
    });
  });

  test("produces a signature verifiable with the matching public key", () => {
    const jwt = createSignedJwt({
      clientEmail: "test@example.iam.gserviceaccount.com",
      privateKeyPem: privateKey,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      audience: "https://oauth2.googleapis.com/token",
      issuedAtSeconds: 1_000_000,
    });

    const [headerB64, payloadB64, signatureB64] = jwt.split(".");
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();

    expect(verifier.verify(publicKey, Buffer.from(signatureB64, "base64url"))).toBe(true);
  });

  test("a signature made with the wrong key does not verify", () => {
    const otherKeyPair = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });

    const jwt = createSignedJwt({
      clientEmail: "test@example.iam.gserviceaccount.com",
      privateKeyPem: otherKeyPair.privateKey,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      audience: "https://oauth2.googleapis.com/token",
      issuedAtSeconds: 1_000_000,
    });

    const [headerB64, payloadB64, signatureB64] = jwt.split(".");
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();

    expect(verifier.verify(publicKey, Buffer.from(signatureB64, "base64url"))).toBe(false);
  });
});

describe("normalizePrivateKey", () => {
  test("leaves a PEM key with real newlines unchanged", () => {
    expect(normalizePrivateKey(privateKey)).toBe(privateKey);
  });

  test("converts literal \\n escape sequences (as pasted into a .env file) into real newlines", () => {
    const escaped = privateKey.replace(/\n/g, "\\n");
    expect(normalizePrivateKey(escaped)).toBe(privateKey);
  });
});
