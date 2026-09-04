import { afterEach, describe, expect, test, vi } from "vitest";
import { downloadFile, listAudioFiles, listSubfolders } from "./drive-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

describe("listSubfolders", () => {
  test("queries Drive for folders directly under the given parent and maps the response", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ files: [{ id: "f1", name: "テスト株式会社" }] })
    );

    const result = await listSubfolders("token-1", "root-folder", fetchImpl);

    expect(result).toEqual([{ id: "f1", name: "テスト株式会社" }]);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain("mimeType%20%3D%20'application%2Fvnd.google-apps.folder'");
    expect(url).toContain("'root-folder'%20in%20parents");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer token-1" });
  });

  test("escapes single quotes in the folder id to avoid breaking the Drive query syntax", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => jsonResponse({ files: [] }));
    await listSubfolders("token-1", "id'with'quote", fetchImpl);
    const [url] = fetchImpl.mock.calls[0];
    expect(url).toContain("id%5C'with%5C'quote");
  });

  test("throws when the request fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "forbidden" }, 403));
    await expect(listSubfolders("token-1", "root-folder", fetchImpl)).rejects.toThrow(
      "Google Driveフォルダ一覧の取得に失敗しました(403)"
    );
  });
});

describe("listAudioFiles", () => {
  test("queries Drive for audio files directly under the given folder", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({
        files: [
          {
            id: "file1",
            name: "商談.mp3",
            mimeType: "audio/mpeg",
            webViewLink: "https://drive.google.com/file/d/file1/view",
          },
        ],
      })
    );

    const result = await listAudioFiles("token-1", "company-folder", fetchImpl);

    expect(result).toEqual([
      {
        id: "file1",
        name: "商談.mp3",
        mimeType: "audio/mpeg",
        webViewLink: "https://drive.google.com/file/d/file1/view",
      },
    ]);
    const [url] = fetchImpl.mock.calls[0];
    expect(url).toContain("mimeType%20contains%20'audio%2F'");
    expect(url).toContain("'company-folder'%20in%20parents");
  });
});

describe("downloadFile", () => {
  test("fetches the file content with alt=media", async () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(bytes, { status: 200 })
    );

    const result = await downloadFile("token-1", "file1", fetchImpl);

    expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3]));
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://www.googleapis.com/drive/v3/files/file1?alt=media");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer token-1" });
  });

  test("throws when the download fails", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));
    await expect(downloadFile("token-1", "file1", fetchImpl)).rejects.toThrow(
      "Google Driveファイルのダウンロードに失敗しました(404)"
    );
  });
});
