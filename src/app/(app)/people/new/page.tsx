import { redirect } from "next/navigation";
import { PersonCreateForm } from "@/components/people/person-create-form";
import { requirePageAccess } from "@/lib/auth/page-access";

export default async function NewPersonPage() {
  const { canEdit } = await requirePageAccess("deals");
  if (!canEdit) {
    redirect("/people");
  }

  return <PersonCreateForm />;
}
