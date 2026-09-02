"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProjectSigningInfo = {
  companyId: string;
  companyName: string;
  /** 企業に登録済みの署名者メール、無ければ最新の担当者(contacts.email)を仮のデフォルトとする。 */
  signerEmail: string;
  signerName: string;
};

/**
 * 見積・発注送付フォーム(SCREEN_SPEC.md 5章)で案件を選択した際、
 * クラウドサインの宛先入力欄をあらかじめ埋めるための情報を取得する。
 * あくまで初期値であり、送信者が上書きできる。
 */
export async function getProjectSigningInfo(projectId: string): Promise<ProjectSigningInfo | null> {
  const supabase = await createSupabaseServerClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "company_id, company:companies(name, esignature_email), contact:contacts(name, email)"
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) return null;

  return {
    companyId: project.company_id,
    companyName: project.company?.name ?? "",
    signerEmail: project.company?.esignature_email ?? project.contact?.email ?? "",
    signerName: project.contact?.name ?? project.company?.name ?? "",
  };
}
