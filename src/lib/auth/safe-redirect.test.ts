import { describe, expect, test } from "vitest";
import { getSafeRedirectPath } from "./safe-redirect";

describe("getSafeRedirectPath", () => {
  test("accepts a normal relative path", () => {
    expect(getSafeRedirectPath("/companies/123")).toBe("/companies/123");
  });

  test("falls back to /dashboard when null", () => {
    expect(getSafeRedirectPath(null)).toBe("/dashboard");
  });

  test("falls back to /dashboard when empty", () => {
    expect(getSafeRedirectPath("")).toBe("/dashboard");
  });

  test("rejects a protocol-relative URL (open redirect via //evil.com)", () => {
    expect(getSafeRedirectPath("//evil.com")).toBe("/dashboard");
  });

  test("rejects an absolute URL to another host", () => {
    expect(getSafeRedirectPath("https://evil.com")).toBe("/dashboard");
  });

  test("rejects a path not starting with a single slash", () => {
    expect(getSafeRedirectPath("dashboard")).toBe("/dashboard");
  });

  test("rejects the login page itself to avoid a redirect loop", () => {
    expect(getSafeRedirectPath("/login")).toBe("/dashboard");
  });

  test("rejects a leading backslash (browsers normalize \\ to / in the origin position)", () => {
    expect(getSafeRedirectPath("/\\evil.com")).toBe("/dashboard");
  });

  test("rejects a path containing a backslash anywhere", () => {
    expect(getSafeRedirectPath("/companies/\\evil.com")).toBe("/dashboard");
  });

  test("rejects other login sub-paths too, not just the exact /login", () => {
    expect(getSafeRedirectPath("/login/foo")).toBe("/dashboard");
  });
});
