import { notFound } from "next/navigation";
import { DealDetailShell } from "@/components/deals/deal-detail-shell";
import { getDealById, getDealFormAnswers } from "@/lib/deals/get-deal";
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
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { canEdit } = await requirePageAccess("deals");

  const deal = await getDealById(id);
  if (!deal) {
    notFound();
  }
  const formAnswers = await getDealFormAnswers(id);

  return (
    <DealDetailShell dealId={id} deal={deal} formAnswers={formAnswers} canEdit={canEdit}>
      {children}
    </DealDetailShell>
  );
}
