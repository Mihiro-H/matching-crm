import type { ProjectStatus } from "@/lib/supabase/database.types";

// 案件は商談管理側で受注が確定した時点で初めて作られるため、「受注」から始まる
// (旧「商談中」「見積提出済」の2段階は商談管理(deals)側に移管した)。
export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "won",
  "contract_sent",
  "contracted",
  "in_progress",
  "inspected",
  "payment_pending",
  "completed",
];

/**
 * カンバンビュー(SCREEN_SPEC.md 4章)でのドラッグ&ドロップによる手動ステータス変更ルール。
 * `contracted` はクラウドサインWebhook経由でのみ遷移させる自動反映専用のため、
 * ドロップ先としては常にグレーアウト(不可)にする。それ以外の列へは
 * 前後どちらの方向への移動も許可する。
 */
export function isManualDropAllowed(targetStatus: ProjectStatus): boolean {
  return targetStatus !== "contracted";
}
