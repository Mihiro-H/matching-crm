const ASSEMBLYAI_BASE = "https://api.assemblyai.com/v2";

export type UploadResult = { ok: true; uploadUrl: string } | { ok: false; error: string };
export type RequestTranscriptResult = { ok: true; transcriptId: string } | { ok: false; error: string };

type TranscriptApiStatus = "queued" | "processing" | "completed" | "error";
export type GetTranscriptResult =
  | { ok: true; status: "completed"; text: string; summary: string | null }
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

/** 文字起こし+要約(summarization)を非同期で依頼する。完了はgetTranscriptでポーリングする。 */
export async function requestTranscript(
  apiKey: string,
  audioUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<RequestTranscriptResult> {
  const response = await fetchImpl(`${ASSEMBLYAI_BASE}/transcript`, {
    method: "POST",
    headers: { authorization: apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      audio_url: audioUrl,
      summarization: true,
      summary_model: "informative",
      summary_type: "bullets",
      language_code: "ja",
    }),
  });

  if (!response.ok) {
    return { ok: false, error: `AssemblyAIの文字起こし依頼に失敗しました(${response.status})` };
  }
  const json = (await response.json()) as { id?: string };
  if (!json.id) {
    return { ok: false, error: "AssemblyAIの文字起こし依頼に失敗しました(idが空です)" };
  }
  return { ok: true, transcriptId: json.id };
}

/** 文字起こしの状態を取得する。completedになったらtext/summaryが入る。 */
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
    summary?: string;
    error?: string;
  };

  if (json.status === "error") {
    return { ok: false, error: json.error ?? "AssemblyAIの文字起こしに失敗しました" };
  }
  if (json.status === "completed") {
    return { ok: true, status: "completed", text: json.text ?? "", summary: json.summary ?? null };
  }
  return { ok: true, status: json.status };
}
