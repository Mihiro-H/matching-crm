import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifySharedSecret } from "@/lib/webhooks/verify-signature";
import { triggerNotification } from "@/lib/slack/notify";

const STALE_ESTIMATE_THRESHOLD_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 見積提出済のまま放置されている商談の検知(SCREEN_SPEC.md「商談管理」)。
 * Vercel Cronから1日1回呼ばれる想定(vercel.jsonでスケジュール設定が必要)。
 * 認証は他のcronと同じくVercel Cronの標準方式(Authorization: Bearer {CRON_SECRET})。
 *
 * estimate_submitted_at(見積作成日、estimates/actions.ts参照)から
 * 30日以上経過していて、まだ通知していない(stale_estimate_notified_at is null)商談を
 * 対象にする。見積が再提出されるとestimate_submitted_at/stale_estimate_notified_atの
 * 両方がリセットされるため、同じ商談を何度も通知し続けることはない。
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!secret || !verifySharedSecret(secret, provided)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const thresholdDate = new Date(Date.now() - STALE_ESTIMATE_THRESHOLD_DAYS * MS_PER_DAY).toISOString();

  const { data: staleDeals, error } = await admin
    .from("deals")
    .select("id, person:people(name, company_name_raw, company:companies(name))")
    .eq("status", "estimate_submitted")
    .is("stale_estimate_notified_at", null)
    .lte("estimate_submitted_at", thresholdDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let notifiedCount = 0;

  for (const deal of staleDeals ?? []) {
    const { data: project } = await admin.from("projects").select("title").eq("deal_id", deal.id).maybeSingle();

    await triggerNotification(
      "reminder",
      {
        company_name: deal.person?.company?.name ?? deal.person?.company_name_raw ?? deal.person?.name ?? "",
        project_title: project?.title ?? "",
      },
      { dealId: deal.id }
    );

    await admin.from("deals").update({ stale_estimate_notified_at: new Date().toISOString() }).eq("id", deal.id);

    notifiedCount++;
  }

  return NextResponse.json({ checked: staleDeals?.length ?? 0, notified: notifiedCount });
}
