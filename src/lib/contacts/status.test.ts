import { describe, expect, test } from "vitest";
import { getNextStatusOptions } from "./status";

describe("getNextStatusOptions", () => {
  test("from 'new': can move forward to in_progress, or lose the lead immediately", () => {
    expect(getNextStatusOptions("new")).toEqual(["in_progress", "lost"]);
  });

  test("from 'in_progress': can move forward to negotiating, or lose it", () => {
    expect(getNextStatusOptions("in_progress")).toEqual(["negotiating", "lost"]);
  });

  test("from 'negotiating': can win or lose the deal", () => {
    expect(getNextStatusOptions("negotiating")).toEqual(["won", "lost"]);
  });

  test("'won' is terminal: no further status transitions", () => {
    expect(getNextStatusOptions("won")).toEqual([]);
  });

  test("'lost' is terminal: no further status transitions", () => {
    expect(getNextStatusOptions("lost")).toEqual([]);
  });
});
