import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createContact,
  createContactGroup,
  createDeliverySlip,
  createEstimate,
  createInvoice,
  getDeliverySlipPdf,
  getEstimatePdf,
  getInvoice,
  getInvoicePdf,
} from "./client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

describe("createContactGroup", () => {
  test("creates a contact group and returns its id", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ id: 123, recipient_name: "テスト株式会社" })
    );

    const result = await createContactGroup("token-1", "テスト株式会社", fetchImpl);

    expect(result).toEqual({ ok: true, contactGroupId: "123" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://app.misoca.jp/api/v3/contact_group");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer token-1" });
    expect(JSON.parse(String(init?.body))).toEqual({ recipient_name: "テスト株式会社" });
  });

  test("returns an error when the request fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "invalid" }, 400));
    const result = await createContactGroup("token-1", "テスト株式会社", fetchImpl);
    expect(result).toEqual({ ok: false, error: "Misocaの取引先作成に失敗しました(400): invalid" });
  });

  test("prefers a message field over an error field when both could be present", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: "recipient_nameは必須です" }, 422));
    const result = await createContactGroup("token-1", "", fetchImpl);
    expect(result).toEqual({
      ok: false,
      error: "Misocaの取引先作成に失敗しました(422): recipient_nameは必須です",
    });
  });
});

describe("createContact", () => {
  test("creates a contact(送り先) under a contact_group and returns its id", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ id: 456, contact_group_id: 123 })
    );

    const result = await createContact(
      "token-1",
      { contactGroupId: "123", recipientName: "テスト株式会社" },
      fetchImpl
    );

    expect(result).toEqual({ ok: true, contactId: "456" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://app.misoca.jp/api/v3/contact");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      contact_group_id: 123,
      recipient_name: "テスト株式会社",
    });
  });

  test("returns an error when the request fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "invalid" }, 422));
    const result = await createContact(
      "token-1",
      { contactGroupId: "123", recipientName: "テスト株式会社" },
      fetchImpl
    );
    expect(result).toEqual({ ok: false, error: "Misocaの送り先作成に失敗しました(422): invalid" });
  });
});

describe("createInvoice", () => {
  const baseInput = {
    contactId: "123",
    issueDate: "2026-09-07",
    paymentDueOn: "2026-10-07",
    subject: "LP制作",
    items: [{ name: "LP制作一式", quantity: 1, unitPrice: 300000, taxType: "STANDARD_TAX_10" as const }],
  };

  test("posts the invoice payload and returns the created invoice", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({
        id: 456,
        invoice_number: "INV-0001",
        body: { total_amount_including_tax: 330000 },
      })
    );

    const result = await createInvoice("token-1", baseInput, fetchImpl);

    expect(result).toEqual({
      ok: true,
      invoiceId: "456",
      invoiceNumber: "INV-0001",
      totalAmountIncludingTax: 330000,
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://app.misoca.jp/api/v3/invoice");
    const payload = JSON.parse(String(init?.body));
    expect(payload).toMatchObject({
      contact_id: 123,
      issue_date: "2026-09-07",
      payment_due_on: "2026-10-07",
      subject: "LP制作",
      items: [
        { name: "LP制作一式", quantity: 1, unit_price: 300000, tax_type: "STANDARD_TAX_10" },
      ],
    });
  });

  test("returns an error when the request fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "invalid" }, 422));
    const result = await createInvoice("token-1", baseInput, fetchImpl);
    expect(result).toEqual({ ok: false, error: "Misocaの請求書作成に失敗しました(422): invalid" });
  });
});

describe("getInvoice", () => {
  test("returns the payment status", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL) => jsonResponse({ id: 456, payment_status: 1 }));
    const result = await getInvoice("token-1", "456", fetchImpl);
    expect(result).toEqual({ ok: true, paymentStatus: 1 });
    const [url] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://app.misoca.jp/api/v3/invoice/456");
  });

  test("returns an error when the request fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "not found" }, 404));
    const result = await getInvoice("token-1", "456", fetchImpl);
    expect(result).toEqual({ ok: false, error: "Misocaの請求書取得に失敗しました(404): not found" });
  });
});

describe("getInvoicePdf", () => {
  test("fetches the PDF bytes", async () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL) => new Response(bytes, { status: 200 }));
    const result = await getInvoicePdf("token-1", "456", fetchImpl);
    expect(result.ok).toBe(true);
    if (result.ok) expect(new Uint8Array(result.pdf)).toEqual(new Uint8Array([1, 2, 3]));
    const [url] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://app.misoca.jp/api/v3/invoice/456/pdf");
  });

  test("returns an error when the request fails", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));
    const result = await getInvoicePdf("token-1", "456", fetchImpl);
    expect(result).toEqual({ ok: false, error: "MisocaのPDF取得に失敗しました(404)" });
  });
});

describe("createEstimate", () => {
  const baseInput = {
    contactId: "123",
    issueDate: "2026-09-07",
    subject: "LP制作",
    items: [{ name: "LP制作一式", quantity: 1, unitPrice: 300000, taxType: "STANDARD_TAX_10" as const }],
  };

  test("posts the estimate payload and returns the created estimate", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ id: 789, estimate_number: "EST-0001", body: { total_amount_including_tax: 330000 } })
    );

    const result = await createEstimate("token-1", baseInput, fetchImpl);

    expect(result).toEqual({
      ok: true,
      estimateId: "789",
      estimateNumber: "EST-0001",
      totalAmountIncludingTax: 330000,
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://app.misoca.jp/api/v3/estimate");
    const payload = JSON.parse(String(init?.body));
    expect(payload).toMatchObject({
      contact_id: 123,
      issue_date: "2026-09-07",
      subject: "LP制作",
      items: [{ name: "LP制作一式", quantity: 1, unit_price: 300000, tax_type: "STANDARD_TAX_10" }],
    });
  });

  test("returns an error when the request fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "invalid" }, 422));
    const result = await createEstimate("token-1", baseInput, fetchImpl);
    expect(result).toEqual({ ok: false, error: "Misocaの見積書作成に失敗しました(422): invalid" });
  });
});

describe("getEstimatePdf", () => {
  test("fetches the PDF bytes", async () => {
    const bytes = new Uint8Array([4, 5, 6]).buffer;
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL) => new Response(bytes, { status: 200 }));
    const result = await getEstimatePdf("token-1", "789", fetchImpl);
    expect(result.ok).toBe(true);
    if (result.ok) expect(new Uint8Array(result.pdf)).toEqual(new Uint8Array([4, 5, 6]));
    const [url] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://app.misoca.jp/api/v3/estimate/789/pdf");
  });

  test("returns an error when the request fails", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));
    const result = await getEstimatePdf("token-1", "789", fetchImpl);
    expect(result).toEqual({ ok: false, error: "MisocaのPDF取得に失敗しました(404)" });
  });
});

describe("createDeliverySlip", () => {
  const baseInput = {
    contactId: "123",
    issueDate: "2026-09-07",
    subject: "LP制作",
    items: [{ name: "LP制作一式", quantity: 1, unitPrice: 300000, taxType: "STANDARD_TAX_10" as const }],
  };

  test("posts the delivery slip payload and returns the created delivery slip", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ id: 999, delivery_slip_number: "DS-0001" })
    );

    const result = await createDeliverySlip("token-1", baseInput, fetchImpl);

    expect(result).toEqual({ ok: true, deliverySlipId: "999" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://app.misoca.jp/api/v3/delivery_slip");
    const payload = JSON.parse(String(init?.body));
    expect(payload).toMatchObject({
      contact_id: 123,
      issue_date: "2026-09-07",
      subject: "LP制作",
      items: [{ name: "LP制作一式", quantity: 1, unit_price: 300000, tax_type: "STANDARD_TAX_10" }],
    });
  });

  test("returns an error when the request fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "invalid" }, 422));
    const result = await createDeliverySlip("token-1", baseInput, fetchImpl);
    expect(result).toEqual({ ok: false, error: "Misocaの納品書作成に失敗しました(422): invalid" });
  });
});

describe("getDeliverySlipPdf", () => {
  test("fetches the PDF bytes", async () => {
    const bytes = new Uint8Array([7, 8, 9]).buffer;
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL) => new Response(bytes, { status: 200 }));
    const result = await getDeliverySlipPdf("token-1", "999", fetchImpl);
    expect(result.ok).toBe(true);
    if (result.ok) expect(new Uint8Array(result.pdf)).toEqual(new Uint8Array([7, 8, 9]));
    const [url] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://app.misoca.jp/api/v3/delivery_slip/999/pdf");
  });
});
