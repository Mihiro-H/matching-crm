import { describe, expect, test } from "vitest";
import { buildTodoItems, getMonthRange, sumAmounts } from "./dashboard-metrics";

describe("sumAmounts", () => {
  test("sums the amount field across rows", () => {
    const rows = [{ amount: 100 }, { amount: 250 }, { amount: 50 }];
    expect(sumAmounts(rows)).toBe(400);
  });

  test("returns 0 for an empty array", () => {
    expect(sumAmounts([])).toBe(0);
  });

  test("treats null amounts as 0", () => {
    const rows = [{ amount: 100 }, { amount: null }];
    expect(sumAmounts(rows)).toBe(100);
  });
});

describe("getMonthRange", () => {
  test("returns the UTC start (inclusive) and end (exclusive) of the given date's month", () => {
    const reference = new Date("2026-09-15T03:00:00.000Z");
    const { startIso, endIso } = getMonthRange(reference);

    expect(startIso).toBe("2026-09-01T00:00:00.000Z");
    expect(endIso).toBe("2026-10-01T00:00:00.000Z");
  });

  test("rolls over into January for a December reference date", () => {
    const reference = new Date("2026-12-25T12:00:00.000Z");
    const { startIso, endIso } = getMonthRange(reference);

    expect(startIso).toBe("2026-12-01T00:00:00.000Z");
    expect(endIso).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("buildTodoItems", () => {
  test("combines pending estimates and pending invoices into one list", () => {
    const items = buildTodoItems({
      pendingEstimates: [
        {
          id: "est-1",
          amount: 500000,
          sentAt: "2026-09-01T00:00:00.000Z",
          projectTitle: "コーポレートサイト制作",
          companyName: "株式会社アクメ商事",
        },
      ],
      pendingInvoices: [
        {
          id: "inv-1",
          amount: 300000,
          dueDate: "2026-09-05",
          projectTitle: "採用動画制作",
          companyName: "株式会社ベータ",
        },
      ],
    });

    expect(items).toHaveLength(2);
    // 請求の期日(09-05)が見積送付日(09-01)より新しいため、新しい順で請求が先に来る
    expect(items[0]).toMatchObject({
      type: "invoice_awaiting_payment",
      label: "株式会社ベータ / 採用動画制作",
      href: "/invoices",
    });
    expect(items[1]).toMatchObject({
      type: "estimate_awaiting_signature",
      label: "株式会社アクメ商事 / コーポレートサイト制作",
      href: "/estimates",
    });
  });

  test("sorts the combined list by date, newest first", () => {
    const items = buildTodoItems({
      pendingEstimates: [
        {
          id: "est-old",
          amount: 100,
          sentAt: "2026-01-01T00:00:00.000Z",
          projectTitle: "旧案件",
          companyName: "A社",
        },
      ],
      pendingInvoices: [
        {
          id: "inv-new",
          amount: 200,
          dueDate: "2026-09-01",
          projectTitle: "新案件",
          companyName: "B社",
        },
      ],
    });

    expect(items.map((item) => item.id)).toEqual(["inv-new", "est-old"]);
  });

  test("returns an empty array when there is nothing pending", () => {
    expect(buildTodoItems({ pendingEstimates: [], pendingInvoices: [] })).toEqual([]);
  });
});
