"use client";

import { useEffect, useMemo, useState } from "react";
import { PermissionMatrix } from "./permission-matrix";
import { getUserPagePermissions } from "@/lib/settings/get-permissions";
import { applyPermissionToUsers, saveUserPermissions } from "@/lib/settings/permission-actions";
import { PERMISSION_PAGE_KEYS } from "@/lib/settings/permission-pages";
import type { Department, UserOption } from "@/lib/settings/get-permissions";
import type { PagePermission } from "@/lib/supabase/database.types";
import { PaginationControlsClient } from "@/components/ui/pagination-controls-client";
import { PAGE_SIZE } from "@/lib/pagination";

const PERMISSION_OPTIONS: { value: PagePermission; label: string }[] = [
  { value: "edit", label: "編集" },
  { value: "view", label: "閲覧" },
  { value: "hidden", label: "非表示" },
];

/**
 * 権限設定「個人別」タブ(SCREEN_SPEC.md 10章 9-2)。
 * ユーザーをテーブル表示し、行左端のチェックボックスで複数選択して、
 * 選んだページ・権限レベルを一括適用できる。名前検索・部署絞り込みにも対応する。
 * 1人ずつ全ページのマトリクスを細かく調整したい場合は、行の「詳細設定」から
 * これまで通りの画面(PermissionMatrix)をモーダルで開ける。
 */
export function IndividualPermissionsTab({
  users,
  departments,
}: {
  users: UserOption[];
  departments: Department[];
}) {
  const [nameQuery, setNameQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPageKey, setBulkPageKey] = useState(PERMISSION_PAGE_KEYS[0]?.pageKey ?? "");
  const [bulkPermission, setBulkPermission] = useState<PagePermission>("view");
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<UserOption | null>(null);
  const [page, setPage] = useState(1);

  const departmentNameById = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  const filteredUsers = useMemo(() => {
    const query = nameQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (departmentFilter && u.departmentId !== departmentFilter) return false;
      if (query && !u.name.toLowerCase().includes(query) && !u.email.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [users, nameQuery, departmentFilter]);

  const pagedUsers = useMemo(
    () => filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredUsers, page]
  );

  // 絞り込み条件を変更したら1ページ目に戻す(絞り込み結果が変わるため)。
  function handleNameQueryChange(value: string) {
    setNameQuery(value);
    setPage(1);
  }
  function handleDepartmentFilterChange(value: string) {
    setDepartmentFilter(value);
    setPage(1);
  }

  // 「全選択」チェックボックスは表示中のページに関わらず、絞り込み結果全体を対象にする
  // (一括適用は選択件数分まとめて行う操作のため、ページをまたいで選択できる方が自然)。
  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedIds.has(u.id));

  function toggleUser(userId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const u of filteredUsers) next.delete(u.id);
      } else {
        for (const u of filteredUsers) next.add(u.id);
      }
      return next;
    });
  }

  async function handleApply() {
    setMessage(null);
    setIsApplying(true);
    const result = await applyPermissionToUsers(Array.from(selectedIds), bulkPageKey, bulkPermission);
    setIsApplying(false);
    setMessage(result.success ? `${selectedIds.size}件に適用しました。` : result.error);
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">氏名・メールで検索</span>
          <input
            type="text"
            value={nameQuery}
            onChange={(e) => handleNameQueryChange(e.target.value)}
            className="w-56 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">部署で絞り込み</span>
          <select
            value={departmentFilter}
            onChange={(e) => handleDepartmentFilterChange(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            <option value="">すべて</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-page-bg p-3">
        <span className="text-xs text-neutral-600">選択中 {selectedIds.size}件に一括適用:</span>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">ページ</span>
          <select
            value={bulkPageKey}
            onChange={(e) => setBulkPageKey(e.target.value)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            {PERMISSION_PAGE_KEYS.map(({ pageKey, label }) => (
              <option key={pageKey} value={pageKey}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-600">権限</span>
          <select
            value={bulkPermission}
            onChange={(e) => setBulkPermission(e.target.value as PagePermission)}
            className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            {PERMISSION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={selectedIds.size === 0 || isApplying}
          onClick={handleApply}
          className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
        >
          適用
        </button>
        {message && <p className="text-sm text-neutral-600">{message}</p>}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-neutral-600">
              <th className="w-10 py-2 font-medium">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAllFiltered}
                  aria-label="表示中の全ユーザーを選択"
                  className="h-4 w-4 rounded border-neutral-200 text-primary-500 focus:ring-primary-100"
                />
              </th>
              <th className="py-2 font-medium">氏名</th>
              <th className="py-2 font-medium">メールアドレス</th>
              <th className="py-2 font-medium">部署</th>
              <th className="py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.map((u) => (
              <tr key={u.id} className="border-b border-neutral-100 last:border-0">
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(u.id)}
                    onChange={() => toggleUser(u.id)}
                    aria-label={`${u.name}を選択`}
                    className="h-4 w-4 rounded border-neutral-200 text-primary-500 focus:ring-primary-100"
                  />
                </td>
                <td className="py-2 text-neutral-900">{u.name}</td>
                <td className="py-2 text-neutral-600">{u.email}</td>
                <td className="py-2 text-neutral-600">{departmentNameById.get(u.departmentId ?? "") ?? "-"}</td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => setDetailUser(u)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    詳細設定
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-neutral-600">
                  該当するユーザーはいません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <PaginationControlsClient
          page={page}
          totalCount={filteredUsers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {detailUser && (
        <UserPermissionDetailModal user={detailUser} onClose={() => setDetailUser(null)} />
      )}
    </div>
  );
}

/** 1ユーザー分の全ページ権限をまとめて調整する詳細設定モーダル(従来のUIをそのまま流用)。 */
function UserPermissionDetailModal({ user, onClose }: { user: UserOption; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, PagePermission> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getUserPagePermissions(user.id).then((permissions) => {
      setValues(permissions);
      setIsLoading(false);
    });
  }, [user.id]);

  async function handleSave() {
    if (!values) return;
    setIsSaving(true);
    setMessage(null);
    const rows = PERMISSION_PAGE_KEYS.map(({ pageKey }) => ({ pageKey, permission: values[pageKey] }));
    const result = await saveUserPermissions(user.id, rows);
    setIsSaving(false);
    setMessage(result.success ? "保存しました。" : result.error);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${user.name}の権限詳細設定`}
        className="flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-lg bg-neutral-0 p-6 shadow-md"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-md text-neutral-900">{user.name}の権限設定</h3>
          <button type="button" onClick={onClose} className="text-xs text-neutral-600 hover:underline">
            閉じる
          </button>
        </div>

        {isLoading || !values ? (
          <p className="text-sm text-neutral-600">読み込み中...</p>
        ) : (
          <>
            <PermissionMatrix
              values={values}
              onChange={(pageKey, permission) => setValues((prev) => ({ ...prev!, [pageKey]: permission }))}
            />
            {message && <p className="text-sm text-neutral-600">{message}</p>}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="self-start rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
            >
              保存
            </button>
          </>
        )}
      </div>
    </div>
  );
}
