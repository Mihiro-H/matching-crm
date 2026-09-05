import { describe, expect, test } from "vitest";
import { parseSummarySections } from "./summary-sections";

describe("parseSummarySections", () => {
  test("parses a well-formed sections object", () => {
    const raw = { keyPoints: ["要点1"], decisions: ["決定1"], nextActions: ["対応1"] };
    expect(parseSummarySections(raw)).toEqual(raw);
  });

  test("returns null for non-object input (no structured summary yet, e.g. old Drive imports)", () => {
    expect(parseSummarySections(null)).toBeNull();
    expect(parseSummarySections(undefined)).toBeNull();
    expect(parseSummarySections("not an object")).toBeNull();
  });

  test("defaults missing or malformed section fields to an empty array", () => {
    expect(parseSummarySections({ keyPoints: ["ok"] })).toEqual({
      keyPoints: ["ok"],
      decisions: [],
      nextActions: [],
    });
    expect(parseSummarySections({ keyPoints: "not an array", decisions: [1, 2], nextActions: null })).toEqual({
      keyPoints: [],
      decisions: [],
      nextActions: [],
    });
  });

  test("drops blank strings", () => {
    expect(parseSummarySections({ keyPoints: ["ok", "  ", ""] })).toEqual({
      keyPoints: ["ok"],
      decisions: [],
      nextActions: [],
    });
  });
});
