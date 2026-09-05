import { afterEach, describe, expect, test, vi } from "vitest";
import { buildMisocaAuthorizeUrl, exchangeMisocaCodeForTokens, refreshMisocaAccessToken } from "./oauth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

describe("buildMisocaAuthorizeUrl", () => {
  test("builds the authorize URL with the required OAuth2 params", () => {
    const url = buildMisocaAuthorizeUrl({
      clientId: "client-1",
      redirectUri: "https://example.com/api/integrations/misoca/callback",
      state: "state-abc",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://app.misoca.jp/oauth2/authorize");
    expect(parsed.searchParams.get("client_id")).toBe("client-1");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://example.com/api/integrations/misoca/callback"
    );
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe("read write");
    expect(parsed.searchParams.get("state")).toBe("state-abc");
  });
});

describe("exchangeMisocaCodeForTokens", () => {
  test("posts an authorization_code grant and returns the tokens", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ access_token: "at-1", refresh_token: "rt-1", expires_in: 86400 })
    );

    const result = await exchangeMisocaCodeForTokens(
      {
        clientId: "client-1",
        clientSecret: "secret-1",
        code: "code-1",
        redirectUri: "https://example.com/api/integrations/misoca/callback",
      },
      fetchImpl
    );

    expect(result).toEqual({ ok: true, accessToken: "at-1", refreshToken: "rt-1", expiresInSeconds: 86400 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://app.misoca.jp/oauth2/token");
    expect(init?.method).toBe("POST");
    const body = String(init?.body);
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("code=code-1");
    expect(body).toContain("client_id=client-1");
    expect(body).toContain("client_secret=secret-1");
  });

  test("returns an error when the token endpoint rejects the code", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "invalid_grant" }, 400));
    const result = await exchangeMisocaCodeForTokens(
      { clientId: "c", clientSecret: "s", code: "bad", redirectUri: "https://example.com/cb" },
      fetchImpl
    );
    expect(result).toEqual({ ok: false, error: "Misocaのトークン取得に失敗しました(400)" });
  });
});

describe("refreshMisocaAccessToken", () => {
  test("posts a refresh_token grant and returns the new tokens", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ access_token: "at-2", refresh_token: "rt-2", expires_in: 86400 })
    );

    const result = await refreshMisocaAccessToken(
      { clientId: "client-1", clientSecret: "secret-1", refreshToken: "rt-1" },
      fetchImpl
    );

    expect(result).toEqual({ ok: true, accessToken: "at-2", refreshToken: "rt-2", expiresInSeconds: 86400 });
    const [, init] = fetchImpl.mock.calls[0];
    const body = String(init?.body);
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=rt-1");
  });

  test("returns an error when the refresh token is rejected", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "invalid_grant" }, 400));
    const result = await refreshMisocaAccessToken(
      { clientId: "c", clientSecret: "s", refreshToken: "expired" },
      fetchImpl
    );
    expect(result).toEqual({ ok: false, error: "Misocaのトークン更新に失敗しました(400)" });
  });
});
