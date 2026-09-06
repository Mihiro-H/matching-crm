import { afterEach, describe, expect, test, vi } from "vitest";
import { sendEmail } from "./client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

describe("sendEmail", () => {
  test("posts the email and returns the Resend message id", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => jsonResponse({ id: "email-1" }));

    const result = await sendEmail(
      "api-key-1",
      { from: "info@example.com", to: "taro@example.com", subject: "件名", text: "本文" },
      fetchImpl
    );

    expect(result).toEqual({ ok: true, id: "email-1" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ authorization: "Bearer api-key-1" });
    expect(JSON.parse(String(init?.body))).toEqual({
      from: "info@example.com",
      to: ["taro@example.com"],
      subject: "件名",
      text: "本文",
    });
  });

  test("returns an error with the response detail when the send fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: "domain is not verified" }, 403));
    const result = await sendEmail(
      "api-key-1",
      { from: "info@example.com", to: "taro@example.com", subject: "件名", text: "本文" },
      fetchImpl
    );
    expect(result).toEqual({ ok: false, error: "メール送信に失敗しました(403: domain is not verified)" });
  });

  test("returns a generic error when the response has no detail", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 500 }));
    const result = await sendEmail(
      "api-key-1",
      { from: "info@example.com", to: "taro@example.com", subject: "件名", text: "本文" },
      fetchImpl
    );
    expect(result).toEqual({ ok: false, error: "メール送信に失敗しました(500)" });
  });
});
