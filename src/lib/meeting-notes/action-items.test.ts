import { describe, expect, test } from "vitest";
import { countPendingActionItems, parseActionItems, toggleActionItem } from "./action-items";

describe("parseActionItems", () => {
  test("parses a well-formed action_items array", () => {
    const raw = [
      { text: "議事録を送付する", done: false },
      { text: "見積を作成する", done: true },
    ];
    expect(parseActionItems(raw)).toEqual(raw);
  });

  test("returns an empty array for non-array input", () => {
    expect(parseActionItems(null)).toEqual([]);
    expect(parseActionItems(undefined)).toEqual([]);
    expect(parseActionItems("not an array")).toEqual([]);
  });

  test("skips malformed entries missing text or done", () => {
    expect(parseActionItems([{ text: "ok", done: false }, { text: "no done field" }, "garbage"])).toEqual([
      { text: "ok", done: false },
    ]);
  });
});

describe("countPendingActionItems", () => {
  test("counts entries where done is false", () => {
    expect(
      countPendingActionItems([
        { text: "a", done: false },
        { text: "b", done: true },
        { text: "c", done: false },
      ])
    ).toBe(2);
  });

  test("returns 0 for an empty list", () => {
    expect(countPendingActionItems([])).toBe(0);
  });
});

describe("toggleActionItem", () => {
  test("flips the done flag at the given index, leaving other entries untouched", () => {
    const items = [
      { text: "a", done: false },
      { text: "b", done: false },
    ];
    expect(toggleActionItem(items, 1)).toEqual([
      { text: "a", done: false },
      { text: "b", done: true },
    ]);
  });

  test("returns the original array unchanged for an out-of-range index", () => {
    const items = [{ text: "a", done: false }];
    expect(toggleActionItem(items, 5)).toEqual(items);
  });
});
