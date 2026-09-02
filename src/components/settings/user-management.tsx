import type { Department, UserOption } from "@/lib/settings/get-permissions";

/**
 * ユーザー管理(SCREEN_SPEC.md 10章 9-2「部署・ユーザーの管理」)。
 *
 * TODO(auth): 新規ユーザー追加は未実装。public.users.id は auth.users.id への
 * 外部キーのため、その人が一度もGoogleログインしていない状態では
 * public.usersの行を作成できない(supabase/migrations/20260902024752_initial_schema.sql
 * のコメント参照)。「管理者が先にアカウントを作成する」というSCREEN_SPEC.mdの
 * ログイン画面の想定と、このFK制約は矛盾しており、認証実装フェーズで
 * 解決方法(招待テーブルを別途持つ/Supabase Admin APIで先にauth.usersを
 * 作成する、等)を確定させる必要がある。
 */
export function UserManagement({ users, departments }: { users: UserOption[]; departments: Department[] }) {
  const departmentName = (id: string | null) => departments.find((d) => d.id === id)?.name ?? "-";

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <h3 className="text-md text-neutral-900">ユーザー管理</h3>

      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-neutral-600">
            <th className="py-2 font-medium">氏名</th>
            <th className="py-2 font-medium">部署</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-neutral-100 last:border-0">
              <td className="py-2 text-neutral-900">{u.name}</td>
              <td className="py-2 text-neutral-600">{departmentName(u.departmentId)}</td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={2} className="py-4 text-center text-neutral-600">
                ユーザーが登録されていません。
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="mt-3 text-xs text-neutral-400">
        新規ユーザーの追加は認証機能の実装後に対応予定です(Googleログインとアカウント作成の順序を確定する必要があります)。
      </p>
    </div>
  );
}
