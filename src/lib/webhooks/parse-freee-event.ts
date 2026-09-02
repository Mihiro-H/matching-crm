export type FreeeEventStatus = "invoiced" | "paid" | "ignored";

export type FreeeEventData = { invoiceId: string; status: FreeeEventStatus };
export type ParseFreeeEventResult = { ok: true; data: FreeeEventData } | { ok: false; error: string };

/**
 * freee Webhook(SCREEN_SPEC.md 7章)のペイロードを検証・パースする。
 * 実際のfreee APIの正確なペイロード形状・イベント名は未確認のため、
 * invoice_id/statusという一般的な形を仮定している。実連携時に公式ドキュメントで
 * 検証・調整すること。
 */
export function parseFreeeEvent(body: unknown): ParseFreeeEventResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "不正なリクエストです" };
  }

  const record = body as Record<string, unknown>;
  const invoiceId = typeof record.invoice_id === "string" ? record.invoice_id : "";
  if (!invoiceId) {
    return { ok: false, error: "invoice_idが空です" };
  }

  const rawStatus = typeof record.status === "string" ? record.status : "";
  let status: FreeeEventStatus;
  if (rawStatus === "paid") {
    status = "paid";
  } else if (rawStatus === "issued") {
    status = "invoiced";
  } else {
    status = "ignored";
  }

  return { ok: true, data: { invoiceId, status } };
}
