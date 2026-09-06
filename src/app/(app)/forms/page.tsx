import Link from "next/link";
import { getForms } from "@/lib/forms/get-forms";
import { formatDateTimeJa } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function FormsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
        <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Supabaseの接続情報を .env に設定すると、フォーム管理が表示されます。
        </p>
      </div>
    );
  }

  const { forms, error } = await getForms();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link href="/forms/new" className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0">
          +新規作成
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          一覧の取得に失敗しました: {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-neutral-600">
              <th className="px-4 py-3 font-medium">フォーム名</th>
              <th className="px-4 py-3 font-medium">項目数</th>
              <th className="px-4 py-3 font-medium">更新日時</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((form) => (
              <tr key={form.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/forms/${form.number}`} className="text-primary-600 hover:underline">
                    {form.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600">{form.fieldCount}項目</td>
                <td className="px-4 py-3 text-neutral-600">{formatDateTimeJa(form.updatedAt)}</td>
              </tr>
            ))}
            {forms.length === 0 && !error && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-neutral-600">
                  フォームはまだありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
