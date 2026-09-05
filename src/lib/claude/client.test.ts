import { afterEach, describe, expect, test, vi } from "vitest";
import { summarizeMeetingTranscript } from "./client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

describe("summarizeMeetingTranscript", () => {
  test("parses the three sections from Claude's JSON response", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              keyPoints: ["予算感について合意した"],
              decisions: ["来月から契約開始"],
              nextActions: ["見積書を送付する"],
            }),
          },
        ],
      })
    );

    const result = await summarizeMeetingTranscript("api-key-1", "文字起こし本文...", fetchImpl);

    expect(result).toEqual({
      ok: true,
      sections: {
        keyPoints: ["予算感について合意した"],
        decisions: ["来月から契約開始"],
        nextActions: ["見積書を送付する"],
      },
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init?.headers).toMatchObject({ "x-api-key": "api-key-1", "anthropic-version": "2023-06-01" });
    const body = JSON.parse(String(init?.body));
    expect(body.messages[0].content).toContain("文字起こし本文...");
  });

  test("strips a markdown code fence around the JSON before parsing", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        content: [{ type: "text", text: '```json\n{"keyPoints": ["a"], "decisions": [], "nextActions": []}\n```' }],
      })
    );

    const result = await summarizeMeetingTranscript("api-key-1", "本文", fetchImpl);
    expect(result).toEqual({ ok: true, sections: { keyPoints: ["a"], decisions: [], nextActions: [] } });
  });

  test("drops non-string entries and defaults missing sections to an empty array", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ content: [{ type: "text", text: '{"keyPoints": ["ok", 123, null]}' }] })
    );

    const result = await summarizeMeetingTranscript("api-key-1", "本文", fetchImpl);
    expect(result).toEqual({ ok: true, sections: { keyPoints: ["ok"], decisions: [], nextActions: [] } });
  });

  test("returns an error including Claude's own error detail when the request fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { message: "invalid api key" } }, 401));
    const result = await summarizeMeetingTranscript("bad-key", "本文", fetchImpl);
    expect(result).toEqual({ ok: false, error: "Claude APIの要約作成に失敗しました(401: invalid api key)" });
  });

  test("returns an error when the response text isn't valid JSON", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ content: [{ type: "text", text: "すみません、要約できません" }] }));
    const result = await summarizeMeetingTranscript("api-key-1", "本文", fetchImpl);
    expect(result).toEqual({ ok: false, error: "Claude APIの応答をJSONとして解釈できませんでした。" });
  });

  test("returns an error when the response has no text content block", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ content: [] }));
    const result = await summarizeMeetingTranscript("api-key-1", "本文", fetchImpl);
    expect(result).toEqual({ ok: false, error: "Claude APIの要約作成に失敗しました(応答が空です)" });
  });
});
