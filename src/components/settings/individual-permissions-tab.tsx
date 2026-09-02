"use client";

import { useState } from "react";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { PermissionMatrix } from "./permission-matrix";
import { searchUsers } from "@/lib/search-select/actions";
import { getUserPagePermissions } from "@/lib/settings/get-permissions";
import { saveUserPermissions } from "@/lib/settings/permission-actions";
import { PERMISSION_PAGE_KEYS } from "@/lib/settings/permission-pages";
import type { PagePermission } from "@/lib/supabase/database.types";

export function IndividualPermissionsTab() {
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResultItem | null>(null);
  const [values, setValues] = useState<Record<string, PagePermission> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUserSelected(items: SearchResultItem[]) {
    const [item] = items;
    if (!item) return;
    setSelectedUser(item);
    setMessage(null);
    const permissions = await getUserPagePermissions(item.id);
    setValues(permissions);
  }

  async function handleSave() {
    if (!selectedUser || !values) return;
    setIsSaving(true);
    setMessage(null);
    const rows = PERMISSION_PAGE_KEYS.map(({ pageKey }) => ({ pageKey, permission: values[pageKey] }));
    const result = await saveUserPermissions(selectedUser.id, rows);
    setIsSaving(false);
    setMessage(result.success ? "保存しました。" : result.error);
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-neutral-900">
          {selectedUser ? selectedUser.label : "ユーザー未選択"}
        </span>
        <button
          type="button"
          onClick={() => setShowUserModal(true)}
          className="text-xs text-primary-600 hover:underline"
        >
          ユーザーを選択
        </button>
      </div>

      {values && (
        <div className="mt-4">
          <PermissionMatrix
            values={values}
            onChange={(pageKey, permission) => setValues((prev) => ({ ...prev!, [pageKey]: permission }))}
          />
          {message && <p className="mt-2 text-sm text-neutral-600">{message}</p>}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="mt-3 rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
          >
            保存
          </button>
        </div>
      )}

      <SearchSelectModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="ユーザーを選択"
        placeholder="氏名で検索"
        mode="single"
        search={searchUsers}
        onConfirm={handleUserSelected}
      />
    </div>
  );
}
