import { describe, expect, test } from "vitest";
import {
  CONTRACT_STATUS_META,
  DEAL_STATUS_META,
  PAYMENT_STATUS_META,
  PROJECT_STATUS_META,
  SEMANTIC_STATUS_CLASSES,
} from "./status-badges";

describe("PROJECT_STATUS_META", () => {
  test("maps every projects.status value(商談中・見積提出済は廃止、受注から始まる)", () => {
    expect(Object.keys(PROJECT_STATUS_META)).toEqual([
      "won",
      "contract_sent",
      "contracted",
      "in_progress",
      "inspected",
      "payment_pending",
      "completed",
    ]);
  });

  test("completed is treated as success, not still-in-flight", () => {
    expect(PROJECT_STATUS_META.completed.semantic).toBe("success");
  });

  test("every semantic category used has bg/text classes defined", () => {
    for (const { semantic } of Object.values(PROJECT_STATUS_META)) {
      expect(SEMANTIC_STATUS_CLASSES[semantic]).toBeDefined();
      expect(SEMANTIC_STATUS_CLASSES[semantic].bg).toMatch(/^bg-/);
      expect(SEMANTIC_STATUS_CLASSES[semantic].text).toMatch(/^text-/);
    }
  });
});

describe("CONTRACT_STATUS_META", () => {
  test("maps every estimates.contract_status value", () => {
    expect(CONTRACT_STATUS_META.draft.semantic).toBe("info");
    expect(CONTRACT_STATUS_META.sent.semantic).toBe("warning");
    expect(CONTRACT_STATUS_META.signed.semantic).toBe("success");
    expect(CONTRACT_STATUS_META.rejected.semantic).toBe("danger");
  });
});

describe("DEAL_STATUS_META", () => {
  test("maps every deals.status value, including the newly added on_hold", () => {
    expect(DEAL_STATUS_META.new.semantic).toBe("info");
    expect(DEAL_STATUS_META.in_progress.semantic).toBe("info");
    expect(DEAL_STATUS_META.negotiating.semantic).toBe("info");
    expect(DEAL_STATUS_META.on_hold.semantic).toBe("warning");
    expect(DEAL_STATUS_META.won.semantic).toBe("success");
    expect(DEAL_STATUS_META.lost.semantic).toBe("danger");
  });
});

describe("PAYMENT_STATUS_META", () => {
  test("maps every invoices.payment_status value", () => {
    expect(PAYMENT_STATUS_META.not_invoiced.semantic).toBe("info");
    expect(PAYMENT_STATUS_META.invoiced.semantic).toBe("warning");
    expect(PAYMENT_STATUS_META.unpaid.semantic).toBe("danger");
    expect(PAYMENT_STATUS_META.paid.semantic).toBe("success");
  });
});
