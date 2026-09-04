import { notFound } from "next/navigation";
import { getContactById } from "@/lib/contacts/get-contact";
import { ContactInfoSection } from "@/components/contacts/contact-info-section";
import { ContactDetailActions } from "@/components/contacts/contact-detail-actions";
import { requirePageAccess } from "@/lib/auth/page-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { SupabaseNotConfiguredNotice } from "@/components/ui/supabase-not-configured-notice";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { id } = await params;
  const { canEdit } = await requirePageAccess("contacts");
  const contact = await getContactById(id);
  if (!contact) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <ContactInfoSection contact={contact} canEdit={canEdit} />
      <ContactDetailActions contact={contact} canEdit={canEdit} />
    </div>
  );
}
