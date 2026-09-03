import { describe, expect, test } from "vitest";
import { excerpt, formatCurrencyJPY, formatDateJa, formatDateTimeJa } from "./format";

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

describe("formatDateTimeJa", () => {
  test("formats an ISO datetime string as year/month/day hour:minute in JST", () => {
    // 2026-09-05T03:00:00.000Z は JST(UTC+9)で 2026/09/05 12:00
    expect(formatDateTimeJa("2026-09-05T03:00:00.000Z")).toBe("2026/09/05 12:00");
  });

  test("carries the date over across midnight when converting to JST", () => {
    // 2026-09-05T20:00:00.000Z は JST で 2026/09/06 05:00
    expect(formatDateTimeJa("2026-09-05T20:00:00.000Z")).toBe("2026/09/06 05:00");
  });
});

describe("excerpt", () => {
  test("returns the text unchanged when shorter than the limit", () => {
    expect(excerpt("短い要約", 10)).toBe("短い要約");
  });

  test("truncates and appends an ellipsis when longer than the limit", () => {
    expect(excerpt("これはとても長いAI要約の本文です", 8)).toBe("これはとても長い…");
  });
});
