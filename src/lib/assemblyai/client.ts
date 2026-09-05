const ASSEMBLYAI_BASE = "https://api.assemblyai.com/v2";

export type UploadResult = { ok: true; uploadUrl: string } | { ok: false; error: string };
export type RequestTranscriptResult = { ok: true; transcriptId: string } | { ok: false; error: string };

type TranscriptApiStatus = "queued" | "processing" | "completed" | "error";
export type GetTranscriptResult =
  | { ok: true; status: "completed"; text: string }
  | { ok: true; status: "queued" | "processing" }
  | { ok: false; error: string };

/**
 * AssemblyAI Web API(https://www.assemblyai.com/docs)クライアント。
 * 音声はいったんAssemblyAI側のCDNへアップロードしてaudio_urlを得てから
 * 文字起こしを依頼する(Driveのファイルを直接公開URL化しなくて済む)。
 */
export async function uploadAudio(
  apiKey: string,
  audio: ArrayBuffer,
  fetchImpl: typeof fetch = fetch
): Promise<UploadResult> {
  const response = await fetchImpl(`${ASSEMBLYAI_BASE}/upload`, {
    method: "POST",
    headers: { authorization: apiKey },
    body: audio,
  });

  if (!response.ok) {
    return { ok: false, error: `AssemblyAIへのアップロードに失敗しました(${response.status})` };
  }
  const json = (await response.json()) as { upload_url?: string };
  if (!json.upload_url) {
    return { ok: false, error: "AssemblyAIへのアップロードに失敗しました(upload_urlが空です)" };
  }
  return { ok: true, uploadUrl: json.upload_url };
}

export type TranscriptWebhookConfig = {
  url: string;
  authHeaderName: string;
  authHeaderValue: string;
};

/**
 * 文字起こしを非同期で依頼する。
 * 要約(summarization)はAssemblyAIのビルトイン機能では依頼しない
 * ―ここにsummarization/summary_model/summary_typeを付けてlanguage_code:"ja"と
 * 組み合わせると「400: The following models are not available in this language:
 * summarization」で依頼自体が拒否される(実際に発生した不具合。日本語音声では
 * ビルトインの要約機能が使えない)。要約は文字起こし完了後、Claude API
 * (claude/client.ts のsummarizeMeetingTranscript)で別途行う
 * (AssemblyAI LeMURは日本語での実用精度が不十分だったため、ユーザー承認のうえ切り替えた)。
 * webhookを渡すと、AssemblyAI側の処理完了/失敗時にそのURLへコールバックしてもらえる
 * (ブラウザがポーリングし続けなくても完了を検知できる。完了はgetTranscriptで確定させる。
 * 未指定時はWebhookなしで依頼するだけになり、呼び出し側のポーリングのみが頼りになる
 * ―ローカル開発などNEXT_PUBLIC_SITE_URLが外部から到達不能な環境向けのフォールバック)。
 */
export async function requestTranscript(
  apiKey: string,
  audioUrl: string,
  webhook?: TranscriptWebhookConfig,
  fetchImpl: typeof fetch = fetch
): Promise<RequestTranscriptResult> {
  const response = await fetchImpl(`${ASSEMBLYAI_BASE}/transcript`, {
    method: "POST",
    headers: { authorization: apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_code: "ja",
      ...(webhook
        ? {
            webhook_url: webhook.url,
            webhook_auth_header_name: webhook.authHeaderName,
            webhook_auth_header_value: webhook.authHeaderValue,
          }
        : {}),
    }),
  });

  if (!response.ok) {
    // AssemblyAIのエラーレスポンスは{"error": "詳細メッセージ"}形式で具体的な原因を返してくる
    // ことが多いため、原因調査しやすいようできる限り本文も含める(webhook_urlの形式不正等、
    // ステータスコードだけでは分からない不具合の切り分けに必要)。
    const detail = await response
      .json()
      .then((body: { error?: string }) => body.error)
      .catch(() => undefined);
    const suffix = detail ? `(${response.status}: ${detail})` : `(${response.status})`;
    return { ok: false, error: `AssemblyAIの文字起こし依頼に失敗しました${suffix}` };
  }
  const json = (await response.json()) as { id?: string };
  if (!json.id) {
    return { ok: false, error: "AssemblyAIの文字起こし依頼に失敗しました(idが空です)" };
  }
  return { ok: true, transcriptId: json.id };
}

/** 文字起こしの状態を取得する。completedになったらtextが入る(要約はclaude/client.ts参照)。 */
export async function getTranscript(
  apiKey: string,
  transcriptId: string,
  fetchImpl: typeof fetch = fetch
): Promise<GetTranscriptResult> {
  const response = await fetchImpl(`${ASSEMBLYAI_BASE}/transcript/${transcriptId}`, {
    headers: { authorization: apiKey },
  });

  if (!response.ok) {
    return { ok: false, error: `AssemblyAIの結果取得に失敗しました(${response.status})` };
  }

  const json = (await response.json()) as {
    status: TranscriptApiStatus;
    text?: string;
    error?: string;
  };

  if (json.status === "error") {
    return { ok: false, error: json.error ?? "AssemblyAIの文字起こしに失敗しました" };
  }
  if (json.status === "completed") {
    return { ok: true, status: "completed", text: json.text ?? "" };
  }
  return { ok: true, status: json.status };
}
