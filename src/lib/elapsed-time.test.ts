import { describe, expect, test } from "vitest";
import { formatElapsedTime } from "./elapsed-time";

describe("formatElapsedTime", () => {
  const now = new Date("2026-09-02T12:00:00.000Z");

  test("shows minutes when less than an hour has passed", () => {
    expect(formatElapsedTime("2026-09-02T11:30:00.000Z", now)).toBe("30分前");
  });

  test("shows hours when less than a day has passed", () => {
    expect(formatElapsedTime("2026-09-02T09:00:00.000Z", now)).toBe("3時間前");
  });

  test("shows days when less than a month has passed", () => {
    expect(formatElapsedTime("2026-08-30T12:00:00.000Z", now)).toBe("3日前");
  });

  test("shows 'たった今' for a timestamp less than a minute ago", () => {
    expect(formatElapsedTime("2026-09-02T11:59:40.000Z", now)).toBe("たった今");
  });
});
