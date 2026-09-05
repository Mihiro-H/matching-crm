import { notFound } from "next/navigation";
import { DealDetailShell } from "@/components/deals/deal-detail-shell";
import { getDealById, getDealFormAnswers } from "@/lib/deals/get-deal";
import { getDealSecondaryAssignees } from "@/lib/deals/get-deal-assignees";
import { resolveDealId } from "@/lib/deals/resolve-deal-id";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";
import { SupabaseNotConfiguredNotice } from "@/components/ui/supabase-not-configured-notice";

export default async function DealDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  // URLのidは短い連番(deals.number)。内部処理は引き続きuuidを使うため解決する
  // (resolve-deal-id.ts参照。URLを短くするための対応)。
  const { id: numberParam } = await params;

  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { canEdit } = await requirePageAccess("deals");

  const dealId = await resolveDealId(numberParam);
  if (!dealId) {
    notFound();
  }

  const deal = await getDealById(dealId);
  if (!deal) {
    notFound();
  }
  const formAnswers = await getDealFormAnswers(dealId);
  const secondaryAssignees = await getDealSecondaryAssignees(dealId);

  return (
    <DealDetailShell
      dealId={dealId}
      dealNumber={deal.number}
      deal={deal}
      formAnswers={formAnswers}
      secondaryAssignees={secondaryAssignees}
      canEdit={canEdit}
    >
      {children}
    </DealDetailShell>
  );
}
