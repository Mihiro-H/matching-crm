import { describe, expect, test } from "vitest";
import { amountDiffersFromBudget } from "./amount-sync";

describe("amountDiffersFromBudget", () => {
  test("returns false when the amount matches the project's current budget", () => {
    expect(amountDiffersFromBudget(300000, 300000)).toBe(false);
  });

  test("returns true when the amount differs from the project's current budget", () => {
    expect(amountDiffersFromBudget(350000, 300000)).toBe(true);
  });

  test("returns true when the project has no budget yet and an amount was entered", () => {
    expect(amountDiffersFromBudget(300000, null)).toBe(true);
  });

  test("returns false when the project has no budget yet and no amount was entered", () => {
    expect(amountDiffersFromBudget(0, null)).toBe(false);
  });
});
