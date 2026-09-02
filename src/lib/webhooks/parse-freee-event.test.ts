import { describe, expect, test } from "vitest";
import { parseFreeeEvent } from "./parse-freee-event";

describe("parseFreeeEvent", () => {
  test("parses a paid invoice event", () => {
    expect(parseFreeeEvent({ invoice_id: "inv-1", status: "paid" })).toEqual({
      ok: true,
      data: { invoiceId: "inv-1", status: "paid" },
    });
  });

  test("parses an issued invoice event", () => {
    expect(parseFreeeEvent({ invoice_id: "inv-1", status: "issued" })).toEqual({
      ok: true,
      data: { invoiceId: "inv-1", status: "invoiced" },
    });
  });

  test("treats an unrecognized status as ignorable", () => {
    expect(parseFreeeEvent({ invoice_id: "inv-1", status: "draft" })).toEqual({
      ok: true,
      data: { invoiceId: "inv-1", status: "ignored" },
    });
  });

  test("errors when invoice_id is missing", () => {
    expect(parseFreeeEvent({ status: "paid" })).toEqual({
      ok: false,
      error: "invoice_idが空です",
    });
  });

  test("errors when the payload is not an object", () => {
    expect(parseFreeeEvent(null)).toEqual({ ok: false, error: "不正なリクエストです" });
  });
});
