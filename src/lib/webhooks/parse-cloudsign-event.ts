export type CloudSignEventStatus = "signed" | "rejected" | "ignored";

export type CloudSignEventData = { documentId: string; status: CloudSignEventStatus };
export type ParseCloudSignEventResult =
  | { ok: true; data: CloudSignEventData }
  | { ok: false; error: string };

/**
 * クラウドサインWebhook(SCREEN_SPEC.md 5章)のペイロードを検証・パースする。
 * 実際のクラウドサインAPIの正確なペイロード形状・イベント名は未確認のため、
 * document_id/statusという一般的な形を仮定している。実連携時に公式ドキュメントで
 * 検証・調整すること。
 */
export function parseCloudSignEvent(body: unknown): ParseCloudSignEventResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "不正なリクエストです" };
  }

  const record = body as Record<string, unknown>;
  const documentId = typeof record.document_id === "string" ? record.document_id : "";
  if (!documentId) {
    return { ok: false, error: "document_idが空です" };
  }

  const rawStatus = typeof record.status === "string" ? record.status : "";
  let status: CloudSignEventStatus;
  if (rawStatus === "signed") {
    status = "signed";
  } else if (rawStatus === "declined" || rawStatus === "rejected") {
    status = "rejected";
  } else {
    status = "ignored";
  }

  return { ok: true, data: { documentId, status } };
}
