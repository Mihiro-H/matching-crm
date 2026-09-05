import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type DealMeetingNote = Database["public"]["Tables"]["meeting_notes"]["Row"];

/**
 * 商談詳細「関連議事録」タブ(SCREEN_SPEC.md「商談管理」)。
 * meeting_notesはproject_id/company_idしか持たないため、商談自体に議事録を
 * 直接紐づける仕組みは設けず、商談の担当者が属する企業に紐づく議事録を表示する
 * (企業がまだ確定していない商談は空のリストになる)。
 */
export async function getMeetingNotesForDeal(
  dealId: string
): Promise<{ meetingNotes: DealMeetingNote[]; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("person:people(company_id)")
    .eq("id", dealId)
    .maybeSingle();

  if (dealError) return { meetingNotes: [], error: dealError.message };
  const companyId = deal?.person?.company_id;
  if (!companyId) return { meetingNotes: [], error: null };

  const { data, error } = await supabase
    .from("meeting_notes")
    .select("*")
    .eq("company_id", companyId)
    .order("meeting_at", { ascending: false });

  if (error) return { meetingNotes: [], error: error.message };
  return { meetingNotes: data ?? [], error: null };
}
