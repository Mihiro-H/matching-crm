export type SummarySections = {
  keyPoints: string[];
  decisions: string[];
  nextActions: string[];
};

/**
 * meeting_notes.ai_summary_sections(jsonb)を安全にパースする(action-items.tsと同じ方針:
 * 壊れたデータ(旧形式・null等)が来ても例外を投げず、想定外のフィールドは読み飛ばす)。
 * nullを返すケースは「構造化データが無い(古いDrive取り込み時代の議事録等)」を表し、
 * 呼び出し側はai_summaryの平文をそのままフォールバック表示する。
 */
export function parseSummarySections(raw: unknown): SummarySections | null {
  if (typeof raw !== "object" || raw === null) return null;

  const record = raw as Record<string, unknown>;
  return {
    keyPoints: toStringArray(record.keyPoints),
    decisions: toStringArray(record.decisions),
    nextActions: toStringArray(record.nextActions),
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}
