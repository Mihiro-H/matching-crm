"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireEditAccess } from "@/lib/auth/require-edit";
import { triggerNotification } from "@/lib/slack/notify";
import type { DealSource, DealStatus, JobCategory } from "@/lib/supabase/database.types";
import { getNextStatusOptions } from "./status";

export type MutationResult = { success: true } | { success: false; error: string };
export type CreateDealResult = { success: true; id: string; number: number } | { success: false; error: string };

/**
 * 商談管理一覧の「+新規作成」(SCREEN_SPEC.md「商談管理」)。
 * 外部フォームWebhook(/api/webhooks/form)以外から商談を手動で登録する経路。
 * source='form'は実際のフォーム経由専用のため、ここでは選ばせない。
 * 企業担当者(person)は既存を選ぶか、その場で新規登録する(SearchSelectModal + インライン新規登録)。
 * 主担当・サブ担当もこの画面で登録できる(どちらも任意。後から詳細ページでも変更可能)。
 * 新規リードという扱いは変わらないため、new_lead通知(Slack+案件振り分け担当者への
 * アプリ内通知)も同様に発火させる。
 */
export async function createDealManual(input: {
  personId: string;
  jobCategories: JobCategory[];
  inquiryBody: string | null;
  source: Exclude<DealSource, "form">;
  primaryAssigneeId: string | null;
  secondaryAssigneeIds: string[];
}): Promise<CreateDealResult> {
  const authCheck = await requireEditAccess("deals");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!input.personId) {
    return { success: false, error: "担当者を選択してください。" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deals")
    .insert({
      person_id: input.personId,
      job_categories: input.jobCategories,
      inquiry_body: input.inquiryBody?.trim() || null,
      source: input.source,
      status: "new",
      assigned_user_id: input.primaryAssigneeId,
    })
    .select("id, number, person:people(name, company_name_raw, company:companies(name))")
    .single();

  if (error) return { success: false, error: error.message };

  // サブ担当は主担当と重複しないぶんだけ登録する(deal_assigneesはサブ担当専用のため)。
  const secondaryIds = input.secondaryAssigneeIds.filter((id) => id !== input.primaryAssigneeId);
  if (secondaryIds.length > 0) {
    await supabase.from("deal_assignees").insert(secondaryIds.map((userId) => ({ deal_id: data.id, user_id: userId })));
  }

  await triggerNotification(
    "new_lead",
    { company_name: data.person?.company?.name ?? data.person?.company_name_raw ?? data.person?.name ?? "" },
    { dealId: data.id }
  );

  revalidatePath("/deals");
  return { success: true, id: data.id, number: data.number };
}

/**
 * 商談の基本項目編集(依頼職種/問い合わせ内容)。
 * ステータス(new/in_progress/...)はwon/lost判定など専用ロジックが絡むため、
 * このアクションでは扱わない(advanceDealStatus/markDealWon/markDealLostを使う)。
 * 担当者本人の氏名/メール/電話番号はpeople側(updatePerson)で編集する。
 */
export async function updateDealDetails(
  dealId: string,
  input: { jobCategories: JobCategory[]; inquiryBody: string | null }
): Promise<MutationResult> {
  const authCheck = await requireEditAccess("deals");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("deals")
    .update({
      job_categories: input.jobCategories,
      inquiry_body: input.inquiryBody?.trim() || null,
    })
    .eq("id", dealId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  return { success: true };
}

/**
 * new→in_progress、in_progress→negotiating など、単純なステータス進行
 * (SCREEN_SPEC.md「商談管理」)。won/lostは専用アクションを使う。
 * view権限のユーザーはこの操作を行えない(SCREEN_SPEC.md「権限」)。
 */
export async function advanceDealStatus(
  dealId: string,
  currentStatus: DealStatus,
  newStatus: Exclude<DealStatus, "new" | "won" | "lost">
): Promise<MutationResult> {
  const authCheck = await requireEditAccess("deals");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!(getNextStatusOptions(currentStatus) as DealStatus[]).includes(newStatus)) {
    return { success: false, error: "その状態には変更できません。" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("deals").update({ status: newStatus }).eq("id", dealId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  return { success: true };
}

/** 失注にする。lost_reasonの入力を必須にする(SCREEN_SPEC.md「商談管理」) */
export async function markDealLost(dealId: string, lostReason: string): Promise<MutationResult> {
  const authCheck = await requireEditAccess("deals");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!lostReason.trim()) {
    return { success: false, error: "失注理由を入力してください。" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("deals")
    .update({ status: "lost", lost_reason: lostReason.trim() })
    .eq("id", dealId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  return { success: true };
}

export type MarkDealWonResult =
  | { success: true; projectId: string; projectNumber: number }
  | { success: false; error: string };

/**
 * 受注確定(SCREEN_SPEC.md「商談管理」)。
 * 1. 担当者(person)がまだ企業に紐づいていなければ、選択/新規登録された企業に紐づける。
 * 2. 商談を status='won' にする(won_reason・won_atを記録)。
 * 3. 案件管理DBに基本情報(企業・窓口担当者・仮の案件名・ステータス「受注」)を
 *    自動的に作成する。案件名は後から編集できるよう仮の名前を入れておく。
 */
export async function markDealWon(
  dealId: string,
  input: { companyId: string; wonReason: string | null }
): Promise<MarkDealWonResult> {
  const authCheck = await requireEditAccess("deals");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("person_id")
    .eq("id", dealId)
    .maybeSingle();
  if (dealError) return { success: false, error: dealError.message };
  if (!deal) return { success: false, error: "商談が見つかりません。" };

  const { data: person, error: personError } = await supabase
    .from("people")
    .select("id, company_id")
    .eq("id", deal.person_id)
    .maybeSingle();
  if (personError) return { success: false, error: personError.message };
  if (!person) return { success: false, error: "担当者が見つかりません。" };

  const companyId = person.company_id ?? input.companyId;
  if (!person.company_id) {
    const { error: linkError } = await supabase
      .from("people")
      .update({ company_id: companyId })
      .eq("id", person.id);
    if (linkError) return { success: false, error: linkError.message };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();
  if (companyError) return { success: false, error: companyError.message };

  const { error: wonError } = await supabase
    .from("deals")
    .update({
      status: "won",
      won_reason: input.wonReason?.trim() || null,
      won_at: new Date().toISOString(),
    })
    .eq("id", dealId);
  if (wonError) return { success: false, error: wonError.message };

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      company_id: companyId,
      contact_id: person.id,
      deal_id: dealId,
      title: `${company?.name ?? "新規"}の案件`,
      status: "won",
    })
    .select("id, number")
    .single();
  if (projectError) return { success: false, error: projectError.message };

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  revalidatePath("/projects");
  return { success: true, projectId: project.id, projectNumber: project.number };
}

/**
 * 主担当を変更する(SCREEN_SPEC.md「商談管理」)。deals.assigned_user_idを直接更新する
 * (project_assigneesのようなrole付きテーブルではなく単一カラムのため、主担当/サブ担当の
 * 入れ替えは発生しない。新しい主担当が既にサブ担当としても登録されていた場合は、
 * 表示が重複しないようそちらから外す)。
 */
export async function setDealPrimaryAssignee(dealId: string, userId: string): Promise<MutationResult> {
  const authCheck = await requireEditAccess("deals");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("deals").update({ assigned_user_id: userId }).eq("id", dealId);
  if (error) return { success: false, error: error.message };

  await supabase.from("deal_assignees").delete().eq("deal_id", dealId).eq("user_id", userId);

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  return { success: true };
}

/**
 * サブ担当を追加する(SCREEN_SPEC.md「商談管理」)。
 * 主担当(assigned_user_id)はここでは変更しない。議事録の閲覧範囲(主担当+サブ担当)にも
 * このテーブルを使う(meeting-notes/visibility.ts参照)。
 */
export async function addSecondaryDealAssignee(dealId: string, userId: string): Promise<MutationResult> {
  const authCheck = await requireEditAccess("deals");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("deal_assignees").insert({ deal_id: dealId, user_id: userId });

  if (error) {
    const message = error.code === "23505" ? "既にこの商談にアサインされています。" : error.message;
    return { success: false, error: message };
  }

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

/** サブ担当を削除する(SCREEN_SPEC.md「商談管理」) */
export async function removeDealAssignee(dealId: string, assigneeId: string): Promise<MutationResult> {
  const authCheck = await requireEditAccess("deals");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("deal_assignees").delete().eq("id", assigneeId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}
