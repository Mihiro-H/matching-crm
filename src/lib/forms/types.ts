import type { FormAnswerType } from "@/lib/supabase/database.types";

export type FormFieldOption = { value: string; label: string };

export type FormFieldRow = {
  id: string;
  fieldKey: string;
  isBuiltin: boolean;
  label: string;
  answerType: FormAnswerType;
  options: FormFieldOption[] | null;
  isRequired: boolean;
  sortOrder: number;
};
