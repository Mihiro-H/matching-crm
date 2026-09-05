"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserFromExistingAuthAccount } from "@/lib/settings/user-provisioning";
import {
  archiveUser,
  setLeadDistributor,
  unarchiveUser,
  updateUserDetails,
} from "@/lib/settings/user-management-actions";
import type { Department, UserOption } from "@/lib/settings/get-permissions";
import type { UserRole } from "@/lib/supabase/database.types";

const ROLE_LABELS: Record<UserRole, string> = { sales: "営業", accounting: "経理", admin: "管理者" };

/**
 * ユーザー管理(SCREEN_SPEC.md 10章 9-2「部署・ユーザーの管理」)。
 * 部署管理とは別の設定タブに分離している(settings-tabs.tsx参照)。
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
            <th className="py-2 font-medium">メールアドレス</th>
            <th className="py-2 font-medium">部署</th>
            <th className="py-2 font-medium">案件振り分け担当者</th>
            <th className="py-2 font-medium">状態</th>
            <th className="py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <UserRow key={u.id} user={u} departments={departments} onChanged={() => router.refresh()} />
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-center text-neutral-600">
                ユーザーが登録されていません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-neutral-400">
        案件振り分け担当者は、新規問い合わせ発生時にヘッダーの通知(ベル)を受け取ります。複数人を指定できます。アーカイブ済みのユーザーは指定できません。
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
        登録すると、本人がまだ一度もログインしていない場合は招待メールが送信されます。既に一度でも「Googleでログイン」を試したことがある場合は、招待メールなしでそのまま登録されます。
      </p>
    </div>
  );
}

function UserRow({
  user,
  departments,
  onChanged,
}: {
  user: UserOption;
  departments: Department[];
  onChanged: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [departmentId, setDepartmentId] = useState(user.departmentId ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const departmentName = departments.find((d) => d.id === user.departmentId)?.name ?? "-";

  function handleCancel() {
    setName(user.name);
    setDepartmentId(user.departmentId ?? "");
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    setError(null);
    setIsSubmitting(true);
    const result = await updateUserDetails(user.id, { name, departmentId: departmentId || null });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setIsEditing(false);
    onChanged();
  }

  async function handleToggleLeadDistributor(next: boolean) {
    const result = await setLeadDistributor(user.id, next);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onChanged();
  }

  async function handleArchiveToggle() {
    setError(null);
    setIsSubmitting(true);
    const result = user.isArchived ? await unarchiveUser(user.id) : await archiveUser(user.id);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onChanged();
  }

  return (
    <tr className="border-b border-neutral-100 last:border-0">
      <td className="py-2 align-top text-neutral-900">
        {isEditing ? (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-32 rounded-md border border-neutral-200 bg-neutral-0 px-2 py-1 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        ) : (
          user.name
        )}
        {error && <p className="mt-1 text-xs text-danger-text">{error}</p>}
      </td>
      <td className="py-2 align-top text-neutral-600">{user.email}</td>
      <td className="py-2 align-top text-neutral-600">
        {isEditing ? (
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-2 py-1 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            <option value="">なし</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        ) : (
          departmentName
        )}
      </td>
      <td className="py-2 align-top">
        <input
          type="checkbox"
          checked={user.isLeadDistributor}
          disabled={user.isArchived}
          onChange={(e) => handleToggleLeadDistributor(e.target.checked)}
          aria-label={`${user.name}を案件振り分け担当者にする`}
          className="h-4 w-4 rounded border-neutral-200 text-primary-500 focus:ring-primary-100 disabled:opacity-40"
        />
      </td>
      <td className="py-2 align-top">
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            user.isArchived ? "bg-neutral-100 text-neutral-600" : "bg-success-bg text-success-text"
          }`}
        >
          {user.isArchived ? "アーカイブ済" : "アクティブ"}
        </span>
      </td>
      <td className="py-2 align-top">
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSave}
                className="text-xs text-primary-600 hover:underline disabled:opacity-40"
              >
                保存
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCancel}
                className="text-xs text-neutral-600 hover:underline disabled:opacity-40"
              >
                キャンセル
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setIsEditing(true)} className="text-xs text-primary-600 hover:underline">
              編集
            </button>
          )}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleArchiveToggle}
            className="text-xs text-neutral-600 hover:underline disabled:opacity-40"
          >
            {user.isArchived ? "復帰させる" : "アーカイブする"}
          </button>
        </div>
      </td>
    </tr>
  );
}
