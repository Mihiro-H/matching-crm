import type { SummarySections } from "./summary-sections";

// 一覧カードの抜粋表示(ai_summary、excerpt()でさらに切り詰められる)用の平文を組み立てる。
// 詳細画面は構造化データ(ai_summary_sections)を優先して表示するため、
// ここでの見え方は「抜粋として意味が伝わる」程度で十分。
const TRANSCRIPT_FALLBACK_EXCERPT_LENGTH = 200;

/**
 * 構造化要約(要点/決議事項/ネクストアクション)を1行の平文に変換する。
 * 要約が無い(作成失敗、または未編集)場合は文字起こし冒頭を代わりに使う
 * (完全に空にはしない、というベストエフォート方針)。
 * complete-upload.ts(アップロード完了時)とmeeting-notes/actions.ts(手動編集時)の
 * 両方から使う。
 */
export function buildFlatSummaryExcerpt(sections: SummarySections | null, transcriptText: string): string {
  const bullets = sections ? [...sections.keyPoints, ...sections.decisions, ...sections.nextActions] : [];
  if (bullets.length > 0) return bullets.join(" / ");
  return transcriptText.slice(0, TRANSCRIPT_FALLBACK_EXCERPT_LENGTH);
}
