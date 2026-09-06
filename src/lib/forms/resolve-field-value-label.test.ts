import { describe, expect, test } from "vitest";
import { resolveFieldValueLabel } from "./resolve-field-value-label";

const OPTIONS = [
  { value: "under_100k", label: "10万円未満" },
  { value: "over_100k", label: "10万円以上" },
];

describe("resolveFieldValueLabel", () => {
  test("resolves a single_select value to its option label", () => {
    expect(resolveFieldValueLabel("over_100k", OPTIONS)).toBe("10万円以上");
  });

  test("resolves each value in a multi_select array to its option label", () => {
    expect(resolveFieldValueLabel(["under_100k", "over_100k"], OPTIONS)).toEqual([
      "10万円未満",
      "10万円以上",
    ]);
  });

  test("falls back to the raw value when it does not match any option", () => {
    expect(resolveFieldValueLabel("not_an_option", OPTIONS)).toBe("not_an_option");
  });

  test("returns the raw value unchanged when there are no options (text/textarea fields)", () => {
    expect(resolveFieldValueLabel("自由記述の回答", null)).toBe("自由記述の回答");
  });

  test("returns null unchanged", () => {
    expect(resolveFieldValueLabel(null, OPTIONS)).toBeNull();
  });
});
