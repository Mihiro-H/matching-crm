import { describe, expect, test } from "vitest";
import { parsePageParam, rangeForPage } from "./pagination";

describe("parsePageParam", () => {
  test("parses a valid positive integer string", () => {
    expect(parsePageParam("3")).toBe(3);
  });

  test("falls back to 1 for undefined, non-numeric, zero, or negative values", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-2")).toBe(1);
    expect(parsePageParam("1.5")).toBe(1);
  });
});

describe("rangeForPage", () => {
  test("computes the 0-based inclusive range for a given page and page size", () => {
    expect(rangeForPage(1, 20)).toEqual([0, 19]);
    expect(rangeForPage(2, 20)).toEqual([20, 39]);
    expect(rangeForPage(3, 10)).toEqual([20, 29]);
  });
});
