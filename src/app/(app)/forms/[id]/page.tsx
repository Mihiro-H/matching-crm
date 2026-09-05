import { notFound } from "next/navigation";
import { getFormById } from "@/lib/forms/get-form";
import { FormEditor } from "@/components/forms/form-editor";

export default async function FormEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const form = await getFormById(id);
  if (!form) {
    notFound();
  }

  return <FormEditor form={form} />;
}
