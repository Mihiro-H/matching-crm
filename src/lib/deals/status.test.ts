import { describe, expect, test } from "vitest";
import { getNextStatusOptions } from "./status";

describe("getNextStatusOptions", () => {
  test("from 'new': can move forward, put on hold, or lose it immediately", () => {
    expect(getNextStatusOptions("new")).toEqual(["in_progress", "on_hold", "lost"]);
  });

  test("from 'in_progress': can move forward, put on hold, or lose it", () => {
    expect(getNextStatusOptions("in_progress")).toEqual(["negotiating", "on_hold", "lost"]);
  });

  test("from 'negotiating': can win, put on hold, or lose the deal", () => {
    expect(getNextStatusOptions("negotiating")).toEqual(["won", "on_hold", "lost"]);
  });

  test("from 'on_hold': can resume forward, win, or lose the deal", () => {
    expect(getNextStatusOptions("on_hold")).toEqual(["in_progress", "negotiating", "won", "lost"]);
  });

  test("'won' is terminal: no further status transitions", () => {
    expect(getNextStatusOptions("won")).toEqual([]);
  });

  test("'lost' is terminal: no further status transitions", () => {
    expect(getNextStatusOptions("lost")).toEqual([]);
  });

  test("'estimate_submitted' is terminal for manual transitions: only set automatically on estimate creation", () => {
    expect(getNextStatusOptions("estimate_submitted")).toEqual([]);
  });
});
