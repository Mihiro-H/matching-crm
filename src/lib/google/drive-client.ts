const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const PAGE_SIZE = 1000;

export type DriveFolder = { id: string; name: string };
export type DriveFile = { id: string; name: string; mimeType: string; webViewLink: string | null };

/** Drive APIのqクエリ内でシングルクォートはエスケープが必要(公式ドキュメントの記法)。 */
function escapeDriveQueryValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

function buildFilesUrl(query: string, fields: string): string {
  // URLSearchParamsは空白を"+"にエンコードするため、Drive APIのqパラメータ用に
  // 素直な%20エンコードとなるencodeURIComponentを使う。
  return (
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}` +
    `&fields=${encodeURIComponent(fields)}&pageSize=${PAGE_SIZE}`
  );
}

/** 指定フォルダの直下にあるサブフォルダ一覧(企業名フォルダの列挙に使う)。 */
export async function listSubfolders(
  accessToken: string,
  parentFolderId: string,
  fetchImpl: typeof fetch = fetch
): Promise<DriveFolder[]> {
  const query = `'${escapeDriveQueryValue(parentFolderId)}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = buildFilesUrl(query, "files(id,name)");

  const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    throw new Error(`Google Driveフォルダ一覧の取得に失敗しました(${response.status})`);
  }
  const json = (await response.json()) as { files?: DriveFolder[] };
  return json.files ?? [];
}

/** 指定フォルダ(企業名フォルダ)直下の音声ファイル一覧。 */
export async function listAudioFiles(
  accessToken: string,
  parentFolderId: string,
  fetchImpl: typeof fetch = fetch
): Promise<DriveFile[]> {
  const query = `'${escapeDriveQueryValue(parentFolderId)}' in parents and mimeType contains 'audio/' and trashed = false`;
  const url = buildFilesUrl(query, "files(id,name,mimeType,webViewLink)");

  const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    throw new Error(`Google Drive音声ファイル一覧の取得に失敗しました(${response.status})`);
  }
  const json = (await response.json()) as {
    files?: { id: string; name: string; mimeType: string; webViewLink?: string }[];
  };
  return (json.files ?? []).map((f) => ({ ...f, webViewLink: f.webViewLink ?? null }));
}

/** ファイルの中身をダウンロードする(AssemblyAIへのアップロード用)。 */
export async function downloadFile(
  accessToken: string,
  fileId: string,
  fetchImpl: typeof fetch = fetch
): Promise<ArrayBuffer> {
  const response = await fetchImpl(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Google Driveファイルのダウンロードに失敗しました(${response.status})`);
  }
  return response.arrayBuffer();
}
