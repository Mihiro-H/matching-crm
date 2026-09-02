import { notFound } from "next/navigation";
import { CompanyDetailShell } from "@/components/companies/company-detail-shell";
import { getCompanyById } from "@/lib/companies/get-company";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function CompanyDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return children;
  }

  const company = await getCompanyById(id);
  if (!company) {
    notFound();
  }

  return (
    <CompanyDetailShell companyId={id} companyName={company.name}>
      {children}
    </CompanyDetailShell>
  );
}
