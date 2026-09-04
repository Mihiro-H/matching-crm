import { afterEach, describe, expect, test, vi } from "vitest";
import { getGoogleDriveAccessToken } from "./service-account-token";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

describe("getGoogleDriveAccessToken", () => {
  test("posts a JWT bearer grant to Google's token endpoint and returns the access token", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ access_token: "token-1", expires_in: 3600 })
    );

    const result = await getGoogleDriveAccessToken(
      { clientEmail: "sa@example.iam.gserviceaccount.com", privateKey: "dummy" },
      { fetchImpl, nowSeconds: 1_000_000, signJwt: () => "signed.jwt.value" }
    );

    expect(result).toEqual({ ok: true, accessToken: "token-1" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toContain("grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer");
    expect(String(init?.body)).toContain("assertion=signed.jwt.value");
  });

  test("returns an error when the token endpoint rejects the request", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "invalid_grant" }, 400));

    const result = await getGoogleDriveAccessToken(
      { clientEmail: "sa@example.iam.gserviceaccount.com", privateKey: "dummy" },
      { fetchImpl, signJwt: () => "signed.jwt.value" }
    );

    expect(result).toEqual({ ok: false, error: "Googleアクセストークン取得に失敗しました(400)" });
  });
});
