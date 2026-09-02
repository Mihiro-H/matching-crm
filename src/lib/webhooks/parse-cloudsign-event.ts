/** CloudSignの署名完了ステータスコード(公式ヘルプの実送信ペイロード例で確認済み: status:2) */
const CLOUDSIGN_STATUS_SIGNED = 2;

export type CloudSignEventStatus = "signed" | "unknown";

export type CloudSignEventData = {
  documentId: string;
  status: CloudSignEventStatus;
  /** ステータスの生の数値。unknownの場合の調査・ログ用にそのまま保持する。 */
  rawStatus: number;
};

export type ParseCloudSignEventResult =
  | { ok: true; data: CloudSignEventData }
  | { ok: false; error: string };

/**
 * クラウドサインWebhook(SCREEN_SPEC.md 5章)のペイロードを検証・パースする。
 *
 * フィールド名(documentID/status/userID/email/text)はクラウドサイン公式ヘルプセンター
 * 「Webhook 機能」記載のテスト送信ペイロード例に基づく。ただしstatusの数値コード一覧は
 * 完全には公開されておらず、「2 = 締結完了(COMPLETED)」以外は未確認。そのため2以外は
 * "unknown"として扱い、estimatesのステータスは変更しない(誤った状態遷移をするより安全)。
 * サンドボックス環境で実際に却下・取消イベントを発生させてrawStatusを観測でき次第、
 * 対応するケースをここに追加すること。
 */
export function parseCloudSignEvent(body: unknown): ParseCloudSignEventResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "不正なリクエストです" };
  }

  const record = body as Record<string, unknown>;
  const documentId = typeof record.documentID === "string" ? record.documentID : "";
  if (!documentId) {
    return { ok: false, error: "documentIDが空です" };
  }

  if (typeof record.status !== "number") {
    return { ok: false, error: "statusが不正です" };
  }

  const rawStatus = record.status;
  const status: CloudSignEventStatus = rawStatus === CLOUDSIGN_STATUS_SIGNED ? "signed" : "unknown";

  return { ok: true, data: { documentId, status, rawStatus } };
}
