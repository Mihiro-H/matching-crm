import Link from "next/link";
import { getPeople } from "@/lib/people/get-people";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";

/**
 * 担当者一覧(SCREEN_SPEC.md「担当者一覧」)。
 * 既存顧客・見込み顧客を問わず、企業担当者を横断的にフラット表示する
 * (基本情報: 担当者名・メール・電話番号・企業名のみ)。左サイドバーには表示しない
 * (商談・案件の各詳細ページからのリンクで辿り着く画面のため)。
 */
export default async function PeoplePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
        <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Supabaseの接続情報を .env に設定すると、一覧が表示されます。
        </p>
      </div>
    );
  }

  const { canEdit } = await requirePageAccess("deals");
  const { people, error } = await getPeople();

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <Link href="/people/new" className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0">
            +新規作成
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          一覧の取得に失敗しました: {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-neutral-600">
              <th className="px-4 py-3 font-medium">担当者名</th>
              <th className="px-4 py-3 font-medium">メール</th>
              <th className="px-4 py-3 font-medium">電話番号</th>
              <th className="px-4 py-3 font-medium">企業名</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/people/${person.id}`} className="text-primary-600 hover:underline">
                    {person.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600">{person.email ?? "-"}</td>
                <td className="px-4 py-3 text-neutral-600">{person.phone ?? "-"}</td>
                <td className="px-4 py-3 text-neutral-600">{person.companyName ?? "-"}</td>
              </tr>
            ))}
            {people.length === 0 && !error && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-600">
                  担当者が登録されていません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
