import { describe, expect, test } from "vitest";
import { isFromCloudSignIpRange } from "./cloudsign-ip-allowlist";

describe("isFromCloudSignIpRange", () => {
  test("accepts a production CloudSign IP when env is production", () => {
    expect(isFromCloudSignIpRange("52.68.17.229", "production")).toBe(true);
    expect(isFromCloudSignIpRange("52.198.144.82", "production")).toBe(true);
    expect(isFromCloudSignIpRange("3.112.114.42", "production")).toBe(true);
  });

  test("accepts the sandbox CloudSign IP when env is sandbox", () => {
    expect(isFromCloudSignIpRange("52.197.119.179", "sandbox")).toBe(true);
  });

  test("rejects the sandbox IP when env is production (and vice versa)", () => {
    expect(isFromCloudSignIpRange("52.197.119.179", "production")).toBe(false);
    expect(isFromCloudSignIpRange("52.68.17.229", "sandbox")).toBe(false);
  });

  test("rejects an unrelated IP", () => {
    expect(isFromCloudSignIpRange("203.0.113.1", "production")).toBe(false);
  });

  test("uses only the first hop of a comma-separated X-Forwarded-For value (client IP, not intermediate proxies)", () => {
    expect(isFromCloudSignIpRange("52.68.17.229, 10.0.0.1, 172.16.0.5", "production")).toBe(true);
    expect(isFromCloudSignIpRange("10.0.0.1, 52.68.17.229", "production")).toBe(false);
  });

  test("trims surrounding whitespace around the first hop", () => {
    expect(isFromCloudSignIpRange("  52.68.17.229  , 10.0.0.1", "production")).toBe(true);
  });

  test("rejects when the header is missing", () => {
    expect(isFromCloudSignIpRange(null, "production")).toBe(false);
  });
});
