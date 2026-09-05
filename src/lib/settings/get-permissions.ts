"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PagePermission } from "@/lib/supabase/database.types";
import { PERMISSION_PAGE_KEYS } from "./permission-pages";

export type Department = { id: string; name: string };
export type UserOption = {
  id: string;
  name: string;
  email: string;
  departmentId: string | null;
  isLeadDistributor: boolean;
  isArchived: boolean;
};

export async function getDepartments(): Promise<Department[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("departments").select("id, name").order("name");
  if (error) return [];
  return data ?? [];
}

export async function getUsers(): Promise<UserOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, department_id, is_lead_distributor, is_archived")
    .order("is_archived")
    .order("name");
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    departmentId: row.department_id,
    isLeadDistributor: row.is_lead_distributor,
    isArchived: row.is_archived,
  }));
}

/** 未設定のページ・ユーザーのデフォルト権限はview(DB_SCHEMA.md確定事項) */
export async function getUserPagePermissions(
  userId: string
): Promise<Record<string, PagePermission>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("user_page_permissions")
    .select("page_key, permission")
    .eq("user_id", userId);

  const result: Record<string, PagePermission> = {};
  for (const { pageKey } of PERMISSION_PAGE_KEYS) {
    result[pageKey] = "view";
  }
  for (const row of data ?? []) {
    result[row.page_key] = row.permission;
  }
  return result;
}

export async function getDepartmentPagePermissions(
  departmentId: string
): Promise<Record<string, PagePermission>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("department_page_permissions")
    .select("page_key, permission")
    .eq("department_id", departmentId);

  const result: Record<string, PagePermission> = {};
  for (const { pageKey } of PERMISSION_PAGE_KEYS) {
    result[pageKey] = "view";
  }
  for (const row of data ?? []) {
    result[row.page_key] = row.permission;
  }
  return result;
}
