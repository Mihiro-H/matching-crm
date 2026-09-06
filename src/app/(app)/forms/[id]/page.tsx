import { notFound } from "next/navigation";
import { getFormById } from "@/lib/forms/get-form";
import { resolveFormId } from "@/lib/forms/resolve-form-id";
import { FormEditor } from "@/components/forms/form-editor";

export default async function FormEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: numberParam } = await params;
  const id = await resolveFormId(numberParam);
  if (!id) {
    notFound();
  }

  const form = await getFormById(id);
  if (!form) {
    notFound();
  }

  return <FormEditor form={form} />;
}
