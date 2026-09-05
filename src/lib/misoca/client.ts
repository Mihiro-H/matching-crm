const MISOCA_API_BASE = "https://app.misoca.jp/api/v3";

export type MisocaTaxType =
  | "STANDARD_TAX_10"
  | "STANDARD_TAX_8"
  | "REDUCED_TAX_8"
  | "STANDARD_TAX_5"
  | "EXEMPTED_TAX";

/**
 * エラーレスポンスの本文からできるだけ詳しいメッセージを取り出す。
 * ステータスコードだけでは(特に422 Unprocessable Entityのような入力値バリデーション
 * エラーで)原因の特定ができないため、Misocaが返す詳細メッセージを可能な限り拾う。
 * 想定される形が複数あるため(message/error/errors)、いずれかがあれば使う。
 */
async function describeErrorResponse(response: Response): Promise<string> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    return "";
  }
  if (!text) return "";

  try {
    const json = JSON.parse(text) as {
      message?: string;
      error?: string;
      errors?: unknown;
    };
    if (typeof json.message === "string") return `: ${json.message}`;
    if (typeof json.error === "string") return `: ${json.error}`;
    if (json.errors !== undefined) return `: ${JSON.stringify(json.errors)}`;
  } catch {
    // JSONでなければ生テキストを使う
  }
  return `: ${text.slice(0, 300)}`;
}

export type CreateContactGroupResult = { ok: true; contactGroupId: string } | { ok: false; error: string };

/**
 * Misoca Web API v3クライアント。フィールド名はMisoca公式のSwagger定義
 * (https://app.misoca.jp/api/v3/swagger_doc)を要約した内容に基づく。
 * 実アカウントでの動作確認が済むまでは、細部(特にcontact_id周りの正式名称)は
 * 要検証として扱うこと。
 */
export async function createContactGroup(
  accessToken: string,
  recipientName: string,
  fetchImpl: typeof fetch = fetch
): Promise<CreateContactGroupResult> {
  const response = await fetchImpl(`${MISOCA_API_BASE}/contact_group`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ recipient_name: recipientName }),
  });

  if (!response.ok) {
    return { ok: false, error: `Misocaの取引先作成に失敗しました(${response.status})${await describeErrorResponse(response)}` };
  }

  const json = (await response.json()) as { id?: number | string };
  if (json.id === undefined) {
    return { ok: false, error: "Misocaの取引先作成に失敗しました(idが空です)" };
  }
  return { ok: true, contactGroupId: String(json.id) };
}

export type CreateContactResult = { ok: true; contactId: string } | { ok: false; error: string };

/**
 * 「送り先(contact)」の作成。取引先(contact_group)そのものではなく、その配下の
 * 送り先を指す点に注意(実アカウントで確認済み: 請求書/見積書のcontact_idに
 * contact_group_idを渡すと「取引先IDに関連する取引先が存在しません」で422になる)。
 */
export async function createContact(
  accessToken: string,
  input: { contactGroupId: string; recipientName: string },
  fetchImpl: typeof fetch = fetch
): Promise<CreateContactResult> {
  const response = await fetchImpl(`${MISOCA_API_BASE}/contact`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      contact_group_id: Number(input.contactGroupId),
      recipient_name: input.recipientName,
    }),
  });

  if (!response.ok) {
    return { ok: false, error: `Misocaの送り先作成に失敗しました(${response.status})${await describeErrorResponse(response)}` };
  }

  const json = (await response.json()) as { id?: number | string };
  if (json.id === undefined) {
    return { ok: false, error: "Misocaの送り先作成に失敗しました(idが空です)" };
  }
  return { ok: true, contactId: String(json.id) };
}

export type InvoiceItemInput = {
  name: string;
  quantity: number;
  unitPrice: number;
  taxType: MisocaTaxType;
};

export type CreateInvoiceInput = {
  contactId: string;
  issueDate: string;
  paymentDueOn?: string;
  subject?: string;
  items: InvoiceItemInput[];
};

export type CreateInvoiceResult =
  | { ok: true; invoiceId: string; invoiceNumber: string | null; totalAmountIncludingTax: number | null }
  | { ok: false; error: string };

export async function createInvoice(
  accessToken: string,
  input: CreateInvoiceInput,
  fetchImpl: typeof fetch = fetch
): Promise<CreateInvoiceResult> {
  const response = await fetchImpl(`${MISOCA_API_BASE}/invoice`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      // contact_idはMisoca側では数値(integer)として扱われている模様のため、
      // 文字列のままだとバリデーションエラー(422)になる。数値化して送る。
      contact_id: Number(input.contactId),
      issue_date: input.issueDate,
      payment_due_on: input.paymentDueOn,
      subject: input.subject,
      items: input.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_type: item.taxType,
      })),
    }),
  });

  if (!response.ok) {
    return { ok: false, error: `Misocaの請求書作成に失敗しました(${response.status})${await describeErrorResponse(response)}` };
  }

  const json = (await response.json()) as {
    id?: number | string;
    invoice_number?: string;
    body?: { total_amount_including_tax?: number };
  };
  if (json.id === undefined) {
    return { ok: false, error: "Misocaの請求書作成に失敗しました(idが空です)" };
  }

  return {
    ok: true,
    invoiceId: String(json.id),
    invoiceNumber: json.invoice_number ?? null,
    totalAmountIncludingTax: json.body?.total_amount_including_tax ?? null,
  };
}

export type GetInvoiceResult = { ok: true; paymentStatus: 0 | 1 } | { ok: false; error: string };

/** 入金状況の確認(SCREEN_SPEC.md 7章「精算管理」)。0=未入金、1=入金済。 */
export async function getInvoice(
  accessToken: string,
  invoiceId: string,
  fetchImpl: typeof fetch = fetch
): Promise<GetInvoiceResult> {
  const response = await fetchImpl(`${MISOCA_API_BASE}/invoice/${invoiceId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return { ok: false, error: `Misocaの請求書取得に失敗しました(${response.status})${await describeErrorResponse(response)}` };
  }

  const json = (await response.json()) as { payment_status?: 0 | 1 };
  return { ok: true, paymentStatus: json.payment_status ?? 0 };
}

export type GetPdfResult = { ok: true; pdf: ArrayBuffer } | { ok: false; error: string };

async function fetchPdf(
  accessToken: string,
  path: string,
  fetchImpl: typeof fetch
): Promise<GetPdfResult> {
  const response = await fetchImpl(`${MISOCA_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return { ok: false, error: `MisocaのPDF取得に失敗しました(${response.status})${await describeErrorResponse(response)}` };
  }

  return { ok: true, pdf: await response.arrayBuffer() };
}

/** 請求書PDFの取得。トークンが必要なため、ブラウザへは常にOrbit側でプロキシして返す。 */
export async function getInvoicePdf(
  accessToken: string,
  invoiceId: string,
  fetchImpl: typeof fetch = fetch
): Promise<GetPdfResult> {
  return fetchPdf(accessToken, `/invoice/${invoiceId}/pdf`, fetchImpl);
}

export type EstimateItemInput = InvoiceItemInput;

export type CreateEstimateInput = {
  contactId: string;
  issueDate: string;
  expireDate?: string;
  subject?: string;
  items: EstimateItemInput[];
};

export type CreateEstimateResult =
  | { ok: true; estimateId: string; estimateNumber: string | null; totalAmountIncludingTax: number | null }
  | { ok: false; error: string };

/** 見積書・発注書の作成(SCREEN_SPEC.md 5章)。POST /invoiceとほぼ同じ形。 */
export async function createEstimate(
  accessToken: string,
  input: CreateEstimateInput,
  fetchImpl: typeof fetch = fetch
): Promise<CreateEstimateResult> {
  const response = await fetchImpl(`${MISOCA_API_BASE}/estimate`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      // contact_idはMisoca側では数値(integer)として扱われている模様のため、
      // 文字列のままだとバリデーションエラー(422)になる。数値化して送る。
      contact_id: Number(input.contactId),
      issue_date: input.issueDate,
      expire_date: input.expireDate,
      subject: input.subject,
      items: input.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_type: item.taxType,
      })),
    }),
  });

  if (!response.ok) {
    return { ok: false, error: `Misocaの見積書作成に失敗しました(${response.status})${await describeErrorResponse(response)}` };
  }

  const json = (await response.json()) as {
    id?: number | string;
    estimate_number?: string;
    body?: { total_amount_including_tax?: number };
  };
  if (json.id === undefined) {
    return { ok: false, error: "Misocaの見積書作成に失敗しました(idが空です)" };
  }

  return {
    ok: true,
    estimateId: String(json.id),
    estimateNumber: json.estimate_number ?? null,
    totalAmountIncludingTax: json.body?.total_amount_including_tax ?? null,
  };
}

/** 見積書PDFの取得。 */
export async function getEstimatePdf(
  accessToken: string,
  estimateId: string,
  fetchImpl: typeof fetch = fetch
): Promise<GetPdfResult> {
  return fetchPdf(accessToken, `/estimate/${estimateId}/pdf`, fetchImpl);
}

export type DeliverySlipItemInput = InvoiceItemInput;

export type CreateDeliverySlipInput = {
  contactId: string;
  issueDate: string;
  deliveryDate?: string;
  subject?: string;
  items: DeliverySlipItemInput[];
};

export type CreateDeliverySlipResult = { ok: true; deliverySlipId: string } | { ok: false; error: string };

/** 納品書の作成(SCREEN_SPEC.md 5章)。POST /invoiceと同じ形だが、payment_due_onの代わりにdelivery_dateを使う。 */
export async function createDeliverySlip(
  accessToken: string,
  input: CreateDeliverySlipInput,
  fetchImpl: typeof fetch = fetch
): Promise<CreateDeliverySlipResult> {
  const response = await fetchImpl(`${MISOCA_API_BASE}/delivery_slip`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      contact_id: Number(input.contactId),
      issue_date: input.issueDate,
      delivery_date: input.deliveryDate,
      subject: input.subject,
      items: input.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_type: item.taxType,
      })),
    }),
  });

  if (!response.ok) {
    return { ok: false, error: `Misocaの納品書作成に失敗しました(${response.status})${await describeErrorResponse(response)}` };
  }

  const json = (await response.json()) as { id?: number | string };
  if (json.id === undefined) {
    return { ok: false, error: "Misocaの納品書作成に失敗しました(idが空です)" };
  }

  return { ok: true, deliverySlipId: String(json.id) };
}

/** 納品書PDFの取得。 */
export async function getDeliverySlipPdf(
  accessToken: string,
  deliverySlipId: string,
  fetchImpl: typeof fetch = fetch
): Promise<GetPdfResult> {
  return fetchPdf(accessToken, `/delivery_slip/${deliverySlipId}/pdf`, fetchImpl);
}
