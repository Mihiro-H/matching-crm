const CLOUDSIGN_SANDBOX_HOST = "https://api-sandbox.cloudsign.jp";
const CLOUDSIGN_PRODUCTION_HOST = "https://api.cloudsign.jp";

export type CloudSignEnv = "sandbox" | "production";

export type CreateAndSendDocumentInput = {
  /** CloudSign側で事前に作成済みのテンプレートID(見積書用に用意する想定。納品書はクラウドサイン送付対象外)。 */
  templateId: string;
  title: string;
  signerEmail: string;
  signerName: string;
};

export type CreateAndSendDocumentResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string };

type CreateAndSendDocumentDeps = {
  clientId: string;
  env: CloudSignEnv;
  fetchImpl?: typeof fetch;
};

function baseUrlFor(env: CloudSignEnv): string {
  return env === "production" ? CLOUDSIGN_PRODUCTION_HOST : CLOUDSIGN_SANDBOX_HOST;
}

/**
 * クラウドサインWeb APIクライアント(公式ヘルプ「クラウドサイン Web API 利用ガイド」に
 * 基づく実装)。
 *
 * 注意: リクエストボディの正確なフィールド名(title/template_id/email/name等)は、
 * ヘルプセンターの説明文からの推測を含み、SwaggerHub上の正式なAPI仕様書
 * (要クラウドサインアカウントでのログイン)では未検証。サンドボックス環境で
 * 実際に呼び出し、レスポンスを見ながら調整すること。
 *
 * トークンはリクエストのたびに新規取得する(有効1時間・レート制限800req/分に対して
 * 送信頻度は低いため、キャッシュによる複雑化より単純さを優先)。
 */
export async function createAndSendCloudSignDocument(
  input: CreateAndSendDocumentInput,
  deps: CreateAndSendDocumentDeps
): Promise<CreateAndSendDocumentResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const baseUrl = baseUrlFor(deps.env);

  const tokenResult = await fetchAccessToken(fetchImpl, baseUrl, deps.clientId);
  if (!tokenResult.ok) return tokenResult;
  const { accessToken } = tokenResult;

  const documentResult = await createDocumentFromTemplate(fetchImpl, baseUrl, accessToken, input);
  if (!documentResult.ok) return documentResult;
  const { documentId } = documentResult;

  const participantResult = await addParticipant(fetchImpl, baseUrl, accessToken, documentId, input);
  if (!participantResult.ok) return participantResult;

  const sendResult = await sendDocument(fetchImpl, baseUrl, accessToken, documentId);
  if (!sendResult.ok) return sendResult;

  return { ok: true, documentId };
}

export type CreateAndSendDocumentFromFileInput = {
  fileBytes: ArrayBuffer;
  fileName: string;
  title: string;
  signerEmail: string;
  signerName: string;
};

/**
 * テンプレートではなく、既に出来上がっているPDFファイル(Misocaで発行した見積書等)を
 * そのまま送付・署名依頼する版。テンプレート版と違い「空の書類を作る→ファイルを追加する」
 * の2段階になる。
 */
export async function createAndSendCloudSignDocumentFromFile(
  input: CreateAndSendDocumentFromFileInput,
  deps: CreateAndSendDocumentDeps
): Promise<CreateAndSendDocumentResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const baseUrl = baseUrlFor(deps.env);

  const tokenResult = await fetchAccessToken(fetchImpl, baseUrl, deps.clientId);
  if (!tokenResult.ok) return tokenResult;
  const { accessToken } = tokenResult;

  const documentResult = await createEmptyDocument(fetchImpl, baseUrl, accessToken, input.title);
  if (!documentResult.ok) return documentResult;
  const { documentId } = documentResult;

  const fileResult = await uploadDocumentFile(
    fetchImpl,
    baseUrl,
    accessToken,
    documentId,
    input.fileBytes,
    input.fileName
  );
  if (!fileResult.ok) return fileResult;

  const participantResult = await addParticipant(fetchImpl, baseUrl, accessToken, documentId, input);
  if (!participantResult.ok) return participantResult;

  const sendResult = await sendDocument(fetchImpl, baseUrl, accessToken, documentId);
  if (!sendResult.ok) return sendResult;

  return { ok: true, documentId };
}

async function fetchAccessToken(
  fetchImpl: typeof fetch,
  baseUrl: string,
  clientId: string
): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
  const response = await fetchImpl(`${baseUrl}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `client_id=${encodeURIComponent(clientId)}`,
  });

  if (!response.ok) {
    return { ok: false, error: `クラウドサインのアクセストークン取得に失敗しました(${response.status})` };
  }

  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) {
    return { ok: false, error: "クラウドサインのアクセストークン取得に失敗しました(access_tokenが空です)" };
  }

  return { ok: true, accessToken: json.access_token };
}

async function createDocument(
  fetchImpl: typeof fetch,
  baseUrl: string,
  accessToken: string,
  body: Record<string, string>
): Promise<{ ok: true; documentId: string } | { ok: false; error: string }> {
  const response = await fetchImpl(`${baseUrl}/documents`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return { ok: false, error: `クラウドサインの書類作成に失敗しました(${response.status})` };
  }

  const json = (await response.json()) as { id?: string; documentID?: string };
  const documentId = json.documentID ?? json.id;
  if (!documentId) {
    return { ok: false, error: "クラウドサインの書類作成に失敗しました(書類IDが空です)" };
  }

  return { ok: true, documentId };
}

function createDocumentFromTemplate(
  fetchImpl: typeof fetch,
  baseUrl: string,
  accessToken: string,
  input: CreateAndSendDocumentInput
): Promise<{ ok: true; documentId: string } | { ok: false; error: string }> {
  return createDocument(fetchImpl, baseUrl, accessToken, {
    template_id: input.templateId,
    title: input.title,
  });
}

/** テンプレートを使わず、空の書類を作ってからファイルを追加する方式(Misoca発行PDFの送付用)。 */
async function createEmptyDocument(
  fetchImpl: typeof fetch,
  baseUrl: string,
  accessToken: string,
  title: string
): Promise<{ ok: true; documentId: string } | { ok: false; error: string }> {
  return createDocument(fetchImpl, baseUrl, accessToken, { title });
}

/**
 * 書類にPDFファイルを追加する(公式ヘルプ「書類の作成」で言及される
 * `POST /documents/{documentID}/files`)。multipart/form-dataのフィールド名は
 * 公開ドキュメントに詳細が無いため "file" と仮定している。要検証。
 */
async function uploadDocumentFile(
  fetchImpl: typeof fetch,
  baseUrl: string,
  accessToken: string,
  documentId: string,
  fileBytes: ArrayBuffer,
  fileName: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const formData = new FormData();
  formData.append("file", new Blob([fileBytes], { type: "application/pdf" }), fileName);

  const response = await fetchImpl(`${baseUrl}/documents/${documentId}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  if (!response.ok) {
    return { ok: false, error: `クラウドサインのファイル追加に失敗しました(${response.status})` };
  }

  return { ok: true };
}

async function addParticipant(
  fetchImpl: typeof fetch,
  baseUrl: string,
  accessToken: string,
  documentId: string,
  input: Pick<CreateAndSendDocumentInput, "signerEmail" | "signerName">
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetchImpl(`${baseUrl}/documents/${documentId}/participants`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ email: input.signerEmail, name: input.signerName }),
  });

  if (!response.ok) {
    return { ok: false, error: `クラウドサインの宛先追加に失敗しました(${response.status})` };
  }

  return { ok: true };
}

async function sendDocument(
  fetchImpl: typeof fetch,
  baseUrl: string,
  accessToken: string,
  documentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetchImpl(`${baseUrl}/documents/${documentId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return { ok: false, error: `クラウドサインの送信に失敗しました(${response.status})` };
  }

  return { ok: true };
}
