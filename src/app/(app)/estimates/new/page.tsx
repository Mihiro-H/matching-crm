import { redirect } from "next/navigation";
import { EstimateCreateForm } from "@/components/estimates/estimate-create-form";
import { requirePageAccess } from "@/lib/auth/page-access";

export default async function NewEstimatePage() {
  const { canEdit } = await requirePageAccess("estimates");
  if (!canEdit) {
    redirect("/estimates");
  }

  return <EstimateCreateForm />;
}
