import { notFound } from "next/navigation";
import { PersonDetailShell } from "@/components/people/person-detail-shell";
import { getPersonById } from "@/lib/people/get-person";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";
import { SupabaseNotConfiguredNotice } from "@/components/ui/supabase-not-configured-notice";

export default async function PersonDetailLayout({
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

  const person = await getPersonById(id);
  if (!person) {
    notFound();
  }

  return (
    <PersonDetailShell personId={id} person={person} canEdit={canEdit}>
      {children}
    </PersonDetailShell>
  );
}
