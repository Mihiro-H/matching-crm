import { describe, expect, test } from "vitest";
import { normalizePhoneNumber } from "./normalize-phone";

describe("normalizePhoneNumber", () => {
  test("formats an 11-digit mobile number as 3-4-4", () => {
    expect(normalizePhoneNumber("09012345678")).toBe("090-1234-5678");
    expect(normalizePhoneNumber("08098765432")).toBe("080-9876-5432");
  });

  test("formats a 10-digit number as 3-3-4", () => {
    expect(normalizePhoneNumber("0312345678")).toBe("031-234-5678");
  });

  test("converts full-width digits before formatting", () => {
    expect(normalizePhoneNumber("０９０１２３４５６７８")).toBe("090-1234-5678");
  });

  test("leaves an already-hyphenated number unchanged", () => {
    expect(normalizePhoneNumber("090-1234-5678")).toBe("090-1234-5678");
  });

  test("leaves a number of an unhandled length unchanged", () => {
    expect(normalizePhoneNumber("12345")).toBe("12345");
  });

  test("splits a 10-digit number as 3-3-4 even where the real area code length differs (documented limitation)", () => {
    // 本来0120(フリーダイヤル)は4-3-3が正しいが、市外局番の一覧表を持たない簡易実装のため
    // 一律3-3-4になる(normalize-phone.tsのコメント参照)。
    expect(normalizePhoneNumber("0120123456")).toBe("012-012-3456");
  });

  test("leaves non-numeric input unchanged (e.g. an international +81 number)", () => {
    expect(normalizePhoneNumber("+819012345678")).toBe("+819012345678");
  });

  test("returns an empty string unchanged", () => {
    expect(normalizePhoneNumber("")).toBe("");
    expect(normalizePhoneNumber("   ")).toBe("");
  });

  test("trims surrounding whitespace", () => {
    expect(normalizePhoneNumber("  09012345678  ")).toBe("090-1234-5678");
  });
});
