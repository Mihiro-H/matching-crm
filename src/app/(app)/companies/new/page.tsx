import { redirect } from "next/navigation";
import { CompanyCreateForm } from "@/components/companies/company-create-form";
import { requirePageAccess } from "@/lib/auth/page-access";

export default async function NewCompanyPage() {
  const { canEdit } = await requirePageAccess("companies");
  if (!canEdit) {
    redirect("/companies");
  }

  return <CompanyCreateForm />;
}
