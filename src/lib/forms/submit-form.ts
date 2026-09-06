import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logIntegrationEvent } from "@/lib/integrations/log";
import { triggerNotification } from "@/lib/slack/notify";
import { renderMessageTemplate } from "@/lib/slack/template";
import { sendEmail } from "@/lib/resend/client";
import { JOB_CATEGORY_LABELS } from "@/lib/job-categories";
import { parseFormSubmission } from "./parse-submission";
import type { FormFieldRow } from "./types";
import type { Json, JobCategory } from "@/lib/supabase/database.types";

export type SubmitFormResult = { ok: true; dealId: string } | { ok: false; error: string; status: number };

/**
 * フォーム管理で設定した自動返信メールを送信する。問い合わせ受付自体を止めたくないため、
 * ここで起きた失敗は(Slack通知のtriggerNotificationと同じ位置づけで)呼び出し元へは
 * 伝播させず、integration_logsへ記録するだけにする。
 */
async function sendAutoReplyIfEnabled(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  formId: string,
  dealId: string,
  person: {
    name: string;
    email: string | null;
    companyNameRaw: string | null;
    inquiryBody: string | null;
    jobCategories: JobCategory[];
  }
): Promise<void> {
  if (!person.email) return;

  const { data: form } = await admin
    .from("form_definitions")
    .select("name, auto_reply_enabled, auto_reply_subject, auto_reply_body")
    .eq("id", formId)
    .maybeSingle();

  if (!form?.auto_reply_enabled || !form.auto_reply_subject || !form.auto_reply_body) return;

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    await logIntegrationEvent({
      integrationType: "email",
      direction: "outbound",
      relatedEntityType: "deal",
      relatedEntityId: dealId,
      payload: { to: person.email } as Json,
      status: "failed",
      errorMessage: "RESEND_API_KEY または RESEND_FROM_EMAIL が未設定です。",
    });
    return;
  }

  const placeholders = {
    name: person.name,
    company_name: person.companyNameRaw ?? "",
    form_name: form.name,
    inquiry_body: person.inquiryBody ?? "",
    job_categories: person.jobCategories.map((c) => JOB_CATEGORY_LABELS[c]).join("、"),
  };
  const subject = renderMessageTemplate(form.auto_reply_subject, placeholders);
  const body = renderMessageTemplate(form.auto_reply_body, placeholders);

  try {
    const result = await sendEmail(apiKey, { from: fromEmail, to: person.email, subject, text: body });
    await logIntegrationEvent({
      integrationType: "email",
      direction: "outbound",
      relatedEntityType: "deal",
      relatedEntityId: dealId,
      payload: { to: person.email, subject } as Json,
      status: result.ok ? "success" : "failed",
      errorMessage: result.ok ? undefined : result.error,
    });
  } catch (cause) {
    // fetch自体がネットワーク瞬断等で例外を投げることがある(upload-actions.tsの
    // AssemblyAI呼び出しと同じ理由)。ここで捕まえないと問い合わせ受付自体が失敗になる。
    const message = cause instanceof Error ? cause.message : String(cause);
    await logIntegrationEvent({
      integrationType: "email",
      direction: "outbound",
      relatedEntityType: "deal",
      relatedEntityId: dealId,
      payload: { to: person.email, subject } as Json,
      status: "failed",
      errorMessage: `メール送信中にエラーが発生しました: ${message}`,
    });
  }
}

/**
 * リードの企業名(company_name_raw)を企業一覧(companies)へ自動登録する。
 * 既に同じ企業名(大文字小文字を区別しない完全一致)が登録されていればそれを使い、
 * 無ければ新規作成する(企業自体にはステータスを持たせない方針のため、name以外は
 * 未設定のまま作成する。list-params.tsの「ステータス・担当者は廃止した」と同じ理由)。
 * 企業名が未回答、または登録自体に失敗した場合はnullを返す
 * (people.company_name_rawは残るため、後から手動で企業と紐付け直せる)。
 */
async function resolveOrCreateCompanyId(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  companyName: string | null
): Promise<string | null> {
  const trimmed = companyName?.trim();
  if (!trimmed) return null;

  // 同名企業が複数登録されていても(重複防止前のデータ等)エラーにならないよう、
  // maybeSingle()ではなくlimit(1)で先頭の1件だけを見る。
  const { data: matches } = await admin.from("companies").select("id").ilike("name", trimmed).limit(1);
  if (matches && matches.length > 0) return matches[0].id;

  const { data: created, error } = await admin.from("companies").insert({ name: trimmed }).select("id").single();

  if (error) return null;
  return created.id;
}

/**
 * 同じメールアドレスの担当者が既に存在する場合、統合するかどうかの判断を管理者に
 * 委ねるための通知(アプリ内通知+Slack、duplicate_person_email)を送る。
 * 商談は同じメールアドレスでも意図的に別々のまま登録する仕様のため
 * (問い合わせのたびに新しい商談として扱う)、統合を検討する対象は担当者データのみ。
 */
async function notifyIfDuplicatePersonEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  newPerson: { id: string; name: string; email: string | null }
): Promise<void> {
  if (!newPerson.email) return;

  const { data: existing } = await admin
    .from("people")
    .select("id, name")
    .ilike("email", newPerson.email)
    .neq("id", newPerson.id)
    .limit(1)
    .maybeSingle();

  if (!existing) return;

  await triggerNotification(
    "duplicate_person_email",
    { new_name: newPerson.name, existing_name: existing.name, email: newPerson.email },
    { personId: newPerson.id }
  );
}

/**
 * フォーム送信の共通処理。外部Webhook(/api/webhooks/form/[formId])と、
 * CRM内蔵の公開問い合わせページ(/contact/[formId])の両方から呼ばれる
 * (呼び出し元によって認証方式は異なるが、送信データの検証・保存ロジックは共通のため)。
 * その時点のform_fields構成に基づいてペイロードを検証し、
 * people(担当者)+deals(商談)の2行を作成する。
 */
export async function submitFormSubmission(
  formId: string,
  payload: Record<string, unknown>
): Promise<SubmitFormResult> {
  const admin = createSupabaseAdminClient();
  const { data: fieldRows, error: fieldsError } = await admin
    .from("form_fields")
    .select("*")
    .eq("form_id", formId)
    .order("sort_order", { ascending: true });

  if (fieldsError || !fieldRows || fieldRows.length === 0) {
    return { ok: false, error: "フォームが見つかりません。", status: 404 };
  }

  const fields: FormFieldRow[] = fieldRows.map((row) => ({
    id: row.id,
    fieldKey: row.field_key,
    isBuiltin: row.is_builtin,
    label: row.label,
    answerType: row.answer_type,
    options: Array.isArray(row.options) ? (row.options as { value: string; label: string }[]) : null,
    isRequired: row.is_required,
    sortOrder: row.sort_order,
  }));

  const parsed = parseFormSubmission(fields, payload);
  if (!parsed.ok) {
    await logIntegrationEvent({
      integrationType: "form",
      direction: "inbound",
      payload: payload as Json,
      status: "failed",
      errorMessage: parsed.error,
    });
    return { ok: false, error: parsed.error, status: 400 };
  }

  const companyId = await resolveOrCreateCompanyId(admin, parsed.data.personInsert.company_name_raw);

  const { data: person, error: personError } = await admin
    .from("people")
    .insert({ ...parsed.data.personInsert, company_id: companyId })
    .select("id")
    .single();

  if (personError) {
    await logIntegrationEvent({
      integrationType: "form",
      direction: "inbound",
      payload: payload as Json,
      status: "failed",
      errorMessage: personError.message,
    });
    return { ok: false, error: personError.message, status: 500 };
  }

  await notifyIfDuplicatePersonEmail(admin, {
    id: person.id,
    name: parsed.data.personInsert.name,
    email: parsed.data.personInsert.email,
  });

  const { data: deal, error: dealError } = await admin
    .from("deals")
    .insert({
      person_id: person.id,
      ...parsed.data.dealInsert,
      custom_fields: parsed.data.customFields,
      source: "form",
      status: "new",
      form_id: formId,
    })
    .select("id")
    .single();

  if (dealError) {
    await logIntegrationEvent({
      integrationType: "form",
      direction: "inbound",
      payload: payload as Json,
      status: "failed",
      errorMessage: dealError.message,
    });
    return { ok: false, error: dealError.message, status: 500 };
  }

  await logIntegrationEvent({
    integrationType: "form",
    direction: "inbound",
    relatedEntityType: "deal",
    relatedEntityId: deal.id,
    payload: payload as Json,
    status: "success",
  });

  await triggerNotification(
    "new_lead",
    { company_name: parsed.data.personInsert.company_name_raw ?? parsed.data.personInsert.name },
    { dealId: deal.id }
  );

  await sendAutoReplyIfEnabled(admin, formId, deal.id, {
    name: parsed.data.personInsert.name,
    email: parsed.data.personInsert.email,
    companyNameRaw: parsed.data.personInsert.company_name_raw,
    inquiryBody: parsed.data.dealInsert.inquiry_body,
    jobCategories: parsed.data.dealInsert.job_categories,
  });

  return { ok: true, dealId: deal.id };
}
