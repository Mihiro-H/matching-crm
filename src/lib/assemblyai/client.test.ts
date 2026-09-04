import { afterEach, describe, expect, test, vi } from "vitest";
import { getTranscript, requestTranscript, uploadAudio } from "./client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

describe("uploadAudio", () => {
  test("uploads the raw bytes and returns the temporary upload_url", async () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ upload_url: "https://cdn.assemblyai.com/upload/abc" })
    );

    const result = await uploadAudio("api-key-1", bytes, fetchImpl);

    expect(result).toEqual({ ok: true, uploadUrl: "https://cdn.assemblyai.com/upload/abc" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.assemblyai.com/v2/upload");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ authorization: "api-key-1" });
    expect(init?.body).toBe(bytes);
  });

  test("returns an error when the upload fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "bad audio" }, 400));
    const result = await uploadAudio("api-key-1", new ArrayBuffer(0), fetchImpl);
    expect(result).toEqual({ ok: false, error: "AssemblyAIへのアップロードに失敗しました(400)" });
  });
});

describe("requestTranscript", () => {
  test("submits the uploaded audio url with summarization enabled and returns the transcript id", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ id: "transcript-1", status: "queued" })
    );

    const result = await requestTranscript("api-key-1", "https://cdn.assemblyai.com/upload/abc", fetchImpl);

    expect(result).toEqual({ ok: true, transcriptId: "transcript-1" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.assemblyai.com/v2/transcript");
    expect(JSON.parse(String(init?.body)))
      .toMatchObject({ audio_url: "https://cdn.assemblyai.com/upload/abc", summarization: true });
  });

  test("returns an error when the request fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "invalid url" }, 400));
    const result = await requestTranscript("api-key-1", "bad-url", fetchImpl);
    expect(result).toEqual({ ok: false, error: "AssemblyAIの文字起こし依頼に失敗しました(400)" });
  });
});

describe("getTranscript", () => {
  test("reports still-processing statuses without text/summary", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ status: "processing" }));
    const result = await getTranscript("api-key-1", "transcript-1", fetchImpl);
    expect(result).toEqual({ ok: true, status: "processing" });
  });

  test("returns the text and summary once completed", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ status: "completed", text: "全文...", summary: "要約です" })
    );
    const result = await getTranscript("api-key-1", "transcript-1", fetchImpl);
    expect(result).toEqual({ ok: true, status: "completed", text: "全文...", summary: "要約です" });
  });

  test("surfaces AssemblyAI's own error status as a failure", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ status: "error", error: "音声を認識できません" }));
    const result = await getTranscript("api-key-1", "transcript-1", fetchImpl);
    expect(result).toEqual({ ok: false, error: "音声を認識できません" });
  });

  test("returns an error when the HTTP request itself fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "not found" }, 404));
    const result = await getTranscript("api-key-1", "transcript-1", fetchImpl);
    expect(result).toEqual({ ok: false, error: "AssemblyAIの結果取得に失敗しました(404)" });
  });
});
