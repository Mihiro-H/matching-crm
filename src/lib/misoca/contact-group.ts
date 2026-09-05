import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createContact, createContactGroup } from "./client";

export type GetOrCreateContactResult = { ok: true; contactId: string } | { ok: false; error: string };

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type CompanyMisocaLinks = {
  id: string;
  name: string;
  misocaContactGroupId: string | null;
  misocaContactId: string | null;
};

/**
 * 請求書・見積書のcontact_idに使う「送り先(contact)」を企業ごとに1回だけ作成し、
 * companies.misoca_contact_id に記憶して以後使い回す。
 *
 * Misoca APIは「取引先(contact_group)」と「送り先(contact)」が別エンティティで、
 * invoice/estimateのcontact_idはcontact_groupのidではなくcontactのidを指す
 * (実アカウントで確認済み: contact_group_idを渡すと「取引先IDに関連する取引先が
 * 存在しません」で422になる)。そのため2段階になる:
 *   1. 取引先(contact_group)を1回だけ作成(無ければ)
 *   2. その配下に送り先(contact)を1回だけ作成(無ければ) → これのidを実際に使う
 */
export async function getOrCreateMisocaContact(
  supabase: SupabaseServerClient,
  accessToken: string,
  company: CompanyMisocaLinks
): Promise<GetOrCreateContactResult> {
  if (company.misocaContactId) {
    return { ok: true, contactId: company.misocaContactId };
  }

  let contactGroupId = company.misocaContactGroupId;
  if (!contactGroupId) {
    const groupResult = await createContactGroup(accessToken, company.name);
    if (!groupResult.ok) return groupResult;
    contactGroupId = groupResult.contactGroupId;
    await supabase.from("companies").update({ misoca_contact_group_id: contactGroupId }).eq("id", company.id);
  }

  const contactResult = await createContact(accessToken, {
    contactGroupId,
    recipientName: company.name,
  });
  if (!contactResult.ok) return contactResult;

  await supabase
    .from("companies")
    .update({ misoca_contact_id: contactResult.contactId })
    .eq("id", company.id);

  return { ok: true, contactId: contactResult.contactId };
}
