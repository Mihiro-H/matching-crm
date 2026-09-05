import { afterEach, describe, expect, test, vi } from "vitest";
import { createAndSendCloudSignDocument, createAndSendCloudSignDocumentFromFile } from "./client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const baseInput = {
  templateId: "template-1",
  title: "見積書 - テスト案件",
  signerEmail: "signer@example.com",
  signerName: "署名 太郎",
};

const baseDeps = { clientId: "client-id-1", env: "sandbox" as const };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createAndSendCloudSignDocument", () => {
  test("happy path: token取得 -> 書類作成(テンプレート指定) -> 参加者追加 -> 送信 の順にAPIを呼ぶ", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const href = url.toString();
      if (href.endsWith("/token")) return jsonResponse({ access_token: "token-1", expires_in: 3600 });
      if (href.endsWith("/documents")) return jsonResponse({ id: "doc-1" });
      if (href.endsWith("/documents/doc-1/participants")) return jsonResponse({ id: "participant-1" });
      if (href.endsWith("/documents/doc-1")) return jsonResponse({ id: "doc-1" });
      throw new Error(`unexpected URL: ${href} ${init?.method}`);
    });

    const result = await createAndSendCloudSignDocument(baseInput, { ...baseDeps, fetchImpl });

    expect(result).toEqual({ ok: true, documentId: "doc-1" });
    expect(fetchImpl).toHaveBeenCalledTimes(4);

    const [tokenUrl, tokenInit] = fetchImpl.mock.calls[0];
    expect(tokenUrl.toString()).toBe("https://api-sandbox.cloudsign.jp/token");
    expect(String(tokenInit?.body)).toContain("client_id=client-id-1");

    const [documentsUrl, documentsInit] = fetchImpl.mock.calls[1];
    expect(documentsUrl.toString()).toBe("https://api-sandbox.cloudsign.jp/documents");
    expect(documentsInit?.headers).toMatchObject({ Authorization: "Bearer token-1" });
    expect(JSON.parse(String(documentsInit?.body))).toMatchObject({
      template_id: "template-1",
      title: baseInput.title,
    });

    const [participantsUrl, participantsInit] = fetchImpl.mock.calls[2];
    expect(participantsUrl.toString()).toBe(
      "https://api-sandbox.cloudsign.jp/documents/doc-1/participants"
    );
    expect(JSON.parse(String(participantsInit?.body))).toMatchObject({
      email: baseInput.signerEmail,
      name: baseInput.signerName,
    });

    const [sendUrl, sendInit] = fetchImpl.mock.calls[3];
    expect(sendUrl.toString()).toBe("https://api-sandbox.cloudsign.jp/documents/doc-1");
    expect(sendInit?.method).toBe("POST");
  });

  test("uses the production host when env is 'production'", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const href = url.toString();
      if (href.endsWith("/token")) return jsonResponse({ access_token: "token-1", expires_in: 3600 });
      if (href.endsWith("/documents")) return jsonResponse({ id: "doc-1" });
      if (href.includes("/participants")) return jsonResponse({ id: "participant-1" });
      return jsonResponse({ id: "doc-1" });
    });

    await createAndSendCloudSignDocument(baseInput, {
      ...baseDeps,
      env: "production",
      fetchImpl,
    });

    expect(fetchImpl.mock.calls[0][0].toString()).toBe("https://api.cloudsign.jp/token");
  });

  test("stops and returns an error when token acquisition fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: "invalid client_id" }, 401));

    const result = await createAndSendCloudSignDocument(baseInput, { ...baseDeps, fetchImpl });

    expect(result).toEqual({
      ok: false,
      error: "クラウドサインのアクセストークン取得に失敗しました(401)",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("stops and returns an error when document creation fails, without adding a participant or sending", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const href = url.toString();
      if (href.endsWith("/token")) return jsonResponse({ access_token: "token-1", expires_in: 3600 });
      if (href.endsWith("/documents")) return jsonResponse({ message: "template not found" }, 404);
      throw new Error(`unexpected URL: ${href}`);
    });

    const result = await createAndSendCloudSignDocument(baseInput, { ...baseDeps, fetchImpl });

    expect(result).toEqual({
      ok: false,
      error: "クラウドサインの書類作成に失敗しました(404)",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("stops and returns an error when adding the participant fails, without sending", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const href = url.toString();
      if (href.endsWith("/token")) return jsonResponse({ access_token: "token-1", expires_in: 3600 });
      if (href.endsWith("/documents")) return jsonResponse({ id: "doc-1" });
      if (href.endsWith("/participants")) return jsonResponse({ message: "invalid email" }, 400);
      throw new Error(`unexpected URL: ${href}`);
    });

    const result = await createAndSendCloudSignDocument(baseInput, { ...baseDeps, fetchImpl });

    expect(result).toEqual({
      ok: false,
      error: "クラウドサインの宛先追加に失敗しました(400)",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  test("returns an error when the send step fails", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const href = url.toString();
      if (href.endsWith("/token")) return jsonResponse({ access_token: "token-1", expires_in: 3600 });
      if (href.endsWith("/documents")) return jsonResponse({ id: "doc-1" });
      if (href.endsWith("/participants")) return jsonResponse({ id: "participant-1" });
      return jsonResponse({ message: "server error" }, 500);
    });

    const result = await createAndSendCloudSignDocument(baseInput, { ...baseDeps, fetchImpl });

    expect(result).toEqual({
      ok: false,
      error: "クラウドサインの送信に失敗しました(500)",
    });
  });
});

describe("createAndSendCloudSignDocumentFromFile", () => {
  const fileInput = {
    fileBytes: new Uint8Array([1, 2, 3]).buffer,
    fileName: "見積書.pdf",
    title: "見積書 - テスト案件",
    signerEmail: "signer@example.com",
    signerName: "署名 太郎",
  };

  test("happy path: token取得 -> 書類作成(テンプレート無し) -> ファイル追加 -> 参加者追加 -> 送信", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const href = url.toString();
      if (href.endsWith("/token")) return jsonResponse({ access_token: "token-1", expires_in: 3600 });
      if (href.endsWith("/documents")) return jsonResponse({ id: "doc-1" });
      if (href.endsWith("/documents/doc-1/files")) return jsonResponse({ id: "file-1" });
      if (href.endsWith("/documents/doc-1/participants")) return jsonResponse({ id: "participant-1" });
      if (href.endsWith("/documents/doc-1")) return jsonResponse({ id: "doc-1" });
      throw new Error(`unexpected URL: ${href} ${init?.method}`);
    });

    const result = await createAndSendCloudSignDocumentFromFile(fileInput, { ...baseDeps, fetchImpl });

    expect(result).toEqual({ ok: true, documentId: "doc-1" });
    expect(fetchImpl).toHaveBeenCalledTimes(5);

    const [documentsUrl, documentsInit] = fetchImpl.mock.calls[1];
    expect(documentsUrl.toString()).toBe("https://api-sandbox.cloudsign.jp/documents");
    expect(JSON.parse(String(documentsInit?.body))).toEqual({ title: fileInput.title });
    expect(JSON.parse(String(documentsInit?.body))).not.toHaveProperty("template_id");

    const [filesUrl, filesInit] = fetchImpl.mock.calls[2];
    expect(filesUrl.toString()).toBe("https://api-sandbox.cloudsign.jp/documents/doc-1/files");
    expect(filesInit?.method).toBe("POST");
    expect(filesInit?.body).toBeInstanceOf(FormData);
  });

  test("stops and returns an error when the file upload fails, without adding a participant or sending", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const href = url.toString();
      if (href.endsWith("/token")) return jsonResponse({ access_token: "token-1", expires_in: 3600 });
      if (href.endsWith("/documents")) return jsonResponse({ id: "doc-1" });
      if (href.endsWith("/files")) return jsonResponse({ message: "invalid file" }, 400);
      throw new Error(`unexpected URL: ${href}`);
    });

    const result = await createAndSendCloudSignDocumentFromFile(fileInput, { ...baseDeps, fetchImpl });

    expect(result).toEqual({ ok: false, error: "クラウドサインのファイル追加に失敗しました(400)" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
