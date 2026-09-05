"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireEditAccess } from "@/lib/auth/require-edit";
import { getValidMisocaAccessToken } from "@/lib/misoca/token-store";
import { createInvoice } from "@/lib/misoca/client";
import { getOrCreateMisocaContact } from "@/lib/misoca/contact-group";
import { logIntegrationEvent } from "@/lib/integrations/log";

export type CreateInvoiceResult = { success: true; id: string } | { success: false; error: string };

/**
 * 精算管理の請求書作成(SCREEN_SPEC.md 7章)。Misoca APIで実際の請求書を発行し、
 * その請求書ID(misoca_invoice_id)を持つinvoices行を作成する。
 *
 * 企業ごとにMisoca側の取引先(contact_group)を1回だけ作成し、companies.misoca_contact_group_id
 * に記憶して以後使い回す(毎回新規作成すると同じ企業の取引先が重複してしまうため)。
 */
export async function createInvoiceForProject(input: {
  projectId: string;
  amount: number;
  issuedDate: string;
  dueDate: string | null;
}): Promise<CreateInvoiceResult> {
  const authCheck = await requireEditAccess("invoices");
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (input.amount <= 0) {
    return { success: false, error: "金額を入力してください。" };
  }

  const tokenResult = await getValidMisocaAccessToken();
  if (!tokenResult.ok) return { success: false, error: tokenResult.error };

  const supabase = await createSupabaseServerClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title, company_id, company:companies(name, misoca_contact_group_id, misoca_contact_id)")
    .eq("id", input.projectId)
    .maybeSingle();

  if (projectError || !project) {
    return { success: false, error: projectError?.message ?? "案件が見つかりません。" };
  }

  const contactResult = await getOrCreateMisocaContact(supabase, tokenResult.accessToken, {
    id: project.company_id,
    name: project.company?.name ?? "取引先",
    misocaContactGroupId: project.company?.misoca_contact_group_id ?? null,
    misocaContactId: project.company?.misoca_contact_id ?? null,
  });
  if (!contactResult.ok) {
    await logIntegrationEvent({
      integrationType: "misoca",
      direction: "outbound",
      relatedEntityType: "project",
      relatedEntityId: project.id,
      payload: { step: "getOrCreateMisocaContact", error: contactResult.error } as never,
      status: "failed",
      errorMessage: contactResult.error,
    });
    return { success: false, error: contactResult.error };
  }

  const invoiceResult = await createInvoice(tokenResult.accessToken, {
    contactId: contactResult.contactId,
    issueDate: input.issuedDate,
    paymentDueOn: input.dueDate ?? undefined,
    subject: project.title,
    items: [
      { name: project.title, quantity: 1, unitPrice: input.amount, taxType: "STANDARD_TAX_10" },
    ],
  });

  if (!invoiceResult.ok) {
    // invoices行がまだ無いため、この時点ではproject単位でログを残す。
    await logIntegrationEvent({
      integrationType: "misoca",
      direction: "outbound",
      relatedEntityType: "project",
      relatedEntityId: project.id,
      payload: { step: "createInvoice", result: invoiceResult } as never,
      status: "failed",
      errorMessage: invoiceResult.error,
    });
    return { success: false, error: invoiceResult.error };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("invoices")
    .insert({
      project_id: input.projectId,
      company_id: project.company_id,
      amount: input.amount,
      issued_date: input.issuedDate,
      due_date: input.dueDate,
      payment_status: "invoiced",
      misoca_invoice_id: invoiceResult.invoiceId,
    })
    .select("id")
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // ここでinvoices行のidが確定するので、履歴(invoice詳細画面「入金状況の変更履歴」)は
  // related_entity_type='invoice'で記録する。
  await logIntegrationEvent({
    integrationType: "misoca",
    direction: "outbound",
    relatedEntityType: "invoice",
    relatedEntityId: inserted.id,
    payload: { step: "createInvoice", result: invoiceResult } as never,
    status: "success",
  });

  revalidatePath("/invoices");
  return { success: true, id: inserted.id };
}
