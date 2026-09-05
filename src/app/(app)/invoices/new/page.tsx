import { redirect } from "next/navigation";
import { InvoiceCreateForm } from "@/components/invoices/invoice-create-form";
import { requirePageAccess } from "@/lib/auth/page-access";

export default async function NewInvoicePage() {
  const { canEdit } = await requirePageAccess("invoices");
  if (!canEdit) {
    redirect("/invoices");
  }

  return <InvoiceCreateForm />;
}
