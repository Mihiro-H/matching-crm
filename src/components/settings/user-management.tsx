"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserFromExistingAuthAccount } from "@/lib/settings/user-provisioning";
import { setLeadDistributor } from "@/lib/settings/permission-actions";
import type { Department, UserOption } from "@/lib/settings/get-permissions";
import type { UserRole } from "@/lib/supabase/database.types";

const ROLE_LABELS: Record<UserRole, string> = { sales: "営業", accounting: "経理", admin: "管理者" };

/**
 * ユーザー管理(SCREEN_SPEC.md 10章 9-2「部署・ユーザーの管理」)。
 * public.users.id は auth.users.id への外部キーのため、本人が一度も
 * Googleログインしていない間は登録できない(user-provisioning.ts参照)。
 */
export function UserManagement({ users, departments }: { users: UserOption[]; departments: Department[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("sales");
  const [departmentId, setDepartmentId] = useState<string>(departments[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const departmentName = (id: string | null) => departments.find((d) => d.id === id)?.name ?? "-";

  async function handleToggleLeadDistributor(userId: string, next: boolean) {
    const result = await setLeadDistributor(userId, next);
    if (!result.success) {
      setMessage(result.error);
      return;
    }
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    const result = await createUserFromExistingAuthAccount({
      email,
      name,
      role,
      departmentId: departmentId || null,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setMessage(result.error);
      return;
    }
    setEmail("");
    setName("");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <h3 className="text-md text-neutral-900">ユーザー管理</h3>

      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-neutral-600">
            <th className="py-2 font-medium">氏名</th>
            <th className="py-2 font-medium">部署</th>
            <th className="py-2 font-medium">案件振り分け担当者</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-neutral-100 last:border-0">
              <td className="py-2 text-neutral-900">{u.name}</td>
              <td className="py-2 text-neutral-600">{departmentName(u.departmentId)}</td>
              <td className="py-2">
                <input
                  type="checkbox"
                  checked={u.isLeadDistributor}
                  onChange={(e) => handleToggleLeadDistributor(u.id, e.target.checked)}
                  aria-label={`${u.name}を案件振り分け担当者にする`}
                  className="h-4 w-4 rounded border-neutral-200 text-primary-500 focus:ring-primary-100"
                />
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-neutral-600">
                ユーザーが登録されていません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-neutral-400">
        案件振り分け担当者は、新規問い合わせ発生時にヘッダーの通知(ベル)を受け取ります。複数人を指定できます。
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-2">
        {message && <p className="w-full text-sm text-danger-text">{message}</p>}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">メールアドレス</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-56 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">氏名</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-40 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">ロール</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">部署</span>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            <option value="">なし</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
        >
          登録
        </button>
      </form>
      <p className="mt-2 text-xs text-neutral-400">
        本人が一度も「Googleでログイン」を試みていない場合は登録できません(先に一度ログインを試してもらってください)。
      </p>
    </div>
  );
}
