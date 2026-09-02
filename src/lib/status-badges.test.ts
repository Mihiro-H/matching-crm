import { describe, expect, test } from "vitest";
import {
  COMPANY_STATUS_META,
  CONTACT_STATUS_META,
  CONTRACT_STATUS_META,
  PAYMENT_STATUS_META,
  PROJECT_STATUS_META,
  SEMANTIC_STATUS_CLASSES,
} from "./status-badges";

describe("COMPANY_STATUS_META", () => {
  test("maps every companies.status value to a label and one of the 4 semantic categories", () => {
    expect(COMPANY_STATUS_META.negotiating).toEqual({ label: "商談中", semantic: "info" });
    expect(COMPANY_STATUS_META.active).toEqual({ label: "進行中", semantic: "success" });
    expect(COMPANY_STATUS_META.paused).toEqual({ label: "一時休止", semantic: "warning" });
    expect(COMPANY_STATUS_META.cold).toEqual({ label: "コールド", semantic: "danger" });
  });

  test("every semantic category used has bg/text classes defined", () => {
    for (const { semantic } of Object.values(COMPANY_STATUS_META)) {
      expect(SEMANTIC_STATUS_CLASSES[semantic]).toBeDefined();
      expect(SEMANTIC_STATUS_CLASSES[semantic].bg).toMatch(/^bg-/);
      expect(SEMANTIC_STATUS_CLASSES[semantic].text).toMatch(/^text-/);
    }
  });
});

describe("PROJECT_STATUS_META", () => {
  test("maps every projects.status value (DB_SCHEMA.md 8段階)", () => {
    expect(Object.keys(PROJECT_STATUS_META)).toEqual([
      "negotiating",
      "estimate_submitted",
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
});

describe("CONTRACT_STATUS_META", () => {
  test("maps every estimates.contract_status value", () => {
    expect(CONTRACT_STATUS_META.draft.semantic).toBe("info");
    expect(CONTRACT_STATUS_META.sent.semantic).toBe("warning");
    expect(CONTRACT_STATUS_META.signed.semantic).toBe("success");
    expect(CONTRACT_STATUS_META.rejected.semantic).toBe("danger");
  });
});

describe("CONTACT_STATUS_META", () => {
  test("maps every contacts.status value", () => {
    expect(CONTACT_STATUS_META.new.semantic).toBe("info");
    expect(CONTACT_STATUS_META.in_progress.semantic).toBe("info");
    expect(CONTACT_STATUS_META.negotiating.semantic).toBe("info");
    expect(CONTACT_STATUS_META.won.semantic).toBe("success");
    expect(CONTACT_STATUS_META.lost.semantic).toBe("danger");
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
