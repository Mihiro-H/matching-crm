import { redirect } from "next/navigation";
import { DealCreateForm } from "@/components/deals/deal-create-form";
import { requirePageAccess } from "@/lib/auth/page-access";

export default async function NewDealPage() {
  const { canEdit } = await requirePageAccess("deals");
  if (!canEdit) {
    redirect("/deals");
  }

  return <DealCreateForm />;
}
