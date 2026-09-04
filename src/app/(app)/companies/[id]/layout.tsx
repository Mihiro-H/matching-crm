import { notFound } from "next/navigation";
import { CompanyDetailShell } from "@/components/companies/company-detail-shell";
import { getCompanyById } from "@/lib/companies/get-company";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";
import { SupabaseNotConfiguredNotice } from "@/components/ui/supabase-not-configured-notice";

export default async function CompanyDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    // childrenをそのまま返すと、配下のタブページが未接続のままデータ取得を
    // 試みて例外を投げてしまう(createSupabaseServerClientはthrowする)ため、
    // ここで止めて案内のみ表示する。
    return <SupabaseNotConfiguredNotice />;
  }

  const { canEdit } = await requirePageAccess("companies");

  const company = await getCompanyById(id);
  if (!company) {
    notFound();
  }

  return (
    <CompanyDetailShell companyId={id} company={company} canEdit={canEdit}>
      {children}
    </CompanyDetailShell>
  );
}
