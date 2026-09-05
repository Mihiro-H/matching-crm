const ANTHROPIC_BASE = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";
// 要約用途はHaiku 4.5を使う(ユーザー指定。定型的な要約作成にはこの速度・コストで十分)。
const SUMMARY_MODEL = "claude-haiku-4-5-20251001";
const MAX_SUMMARY_TOKENS = 1024;

export type MeetingSummarySections = {
  keyPoints: string[];
  decisions: string[];
  nextActions: string[];
};

export type SummarizeMeetingResult =
  | { ok: true; sections: MeetingSummarySections }
  | { ok: false; error: string };

/**
 * Claude API(Messages)クライアント。
 * 議事録の文字起こしテキストから、要点/決議事項/ネクストアクションの3分類の要約を作る
 * (SCREEN_SPEC.md 6章「AI要約」)。
 * AssemblyAIのビルトイン要約・LeMURは日本語での実用精度が不十分だったため、
 * こちらに切り替えた(ユーザー承認済み)。文字起こし自体はAssemblyAIのまま変更しない
 * (assemblyai/client.ts参照。Claudeは音声を扱わずテキスト推論のみ行う)。
 */
export async function summarizeMeetingTranscript(
  apiKey: string,
  transcriptText: string,
  fetchImpl: typeof fetch = fetch
): Promise<SummarizeMeetingResult> {
  const prompt = buildSummaryPrompt(transcriptText);

  const response = await fetchImpl(`${ANTHROPIC_BASE}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: SUMMARY_MODEL,
      max_tokens: MAX_SUMMARY_TOKENS,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: { error?: { message?: string } }) => body.error?.message)
      .catch(() => undefined);
    const suffix = detail ? `(${response.status}: ${detail})` : `(${response.status})`;
    return { ok: false, error: `Claude APIの要約作成に失敗しました${suffix}` };
  }

  const json = (await response.json()) as { content?: { type: string; text?: string }[] };
  const text = json.content?.find((block) => block.type === "text")?.text;
  if (!text) {
    return { ok: false, error: "Claude APIの要約作成に失敗しました(応答が空です)" };
  }

  const sections = parseSummaryResponse(text);
  if (!sections) {
    return { ok: false, error: "Claude APIの応答をJSONとして解釈できませんでした。" };
  }
  return { ok: true, sections };
}

function buildSummaryPrompt(transcriptText: string): string {
  return [
    "以下は商談・会議の音声を文字起こししたものです。内容を読み取り、次のJSON形式で",
    "**JSONのみ**を出力してください(前置き・説明文・コードフェンスは付けないこと)。",
    "",
    '{"keyPoints": ["会議内容の要点を簡潔な日本語の文で"], "decisions": ["決定事項があれば"], "nextActions": ["次にやるべきことがあれば"]}',
    "",
    "該当する内容が無い分類は空配列にしてください。各要素は1〜2文程度の簡潔な日本語にしてください。",
    "",
    "文字起こし:",
    transcriptText,
  ].join("\n");
}

/** Claudeがコードフェンス付きで返してくることがあるため、剥がしてからJSONとして解析する。 */
function parseSummaryResponse(text: string): MeetingSummarySections | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\n?/, "")
    .replace(/```\s*$/, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Partial<Record<keyof MeetingSummarySections, unknown>>;
    return {
      keyPoints: toStringArray(parsed.keyPoints),
      decisions: toStringArray(parsed.decisions),
      nextActions: toStringArray(parsed.nextActions),
    };
  } catch {
    return null;
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}
