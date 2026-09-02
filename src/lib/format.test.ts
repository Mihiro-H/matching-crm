import { describe, expect, test } from "vitest";
import { formatCurrencyJPY, formatDateJa } from "./format";

describe("formatCurrencyJPY", () => {
  test("formats a positive amount with the yen sign and thousands separators", () => {
    // Intl.NumberFormat の ja-JP ロケールは全角の「￥」(U+FFE5) を使う
    expect(formatCurrencyJPY(1234567)).toBe("￥1,234,567");
  });

  test("formats zero", () => {
    expect(formatCurrencyJPY(0)).toBe("￥0");
  });
});

describe("formatDateJa", () => {
  test("formats an ISO date string as year/month/day", () => {
    expect(formatDateJa("2026-09-05")).toBe("2026/09/05");
  });

  test("formats an ISO datetime string using its date portion", () => {
    expect(formatDateJa("2026-09-05T03:00:00.000Z")).toBe("2026/09/05");
  });
});
