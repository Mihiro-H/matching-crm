"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseFreelancerCsvRow } from "./csv-import";

/** "add": 未登録(platform_freelancer_idが新規)の行だけ追加、既存行はスキップして触らない。
 *  "overwrite": CSVに含まれる行はすべてupsert(既存行も上書き)。 */
export type FreelancerImportMode = "add" | "overwrite";

export type ImportFreelancersCsvResult =
  | {
      success: true;
      rowCount: number;
      successCount: number;
      skippedCount: number;
      errorCount: number;
      errorLog: { row: number; message: string }[];
    }
  | { success: false; error: string };

/**
 * フリーランスCSVインポート(SCREEN_SPEC.md 9章)。
 * platform_freelancer_idをキーにupsertし、行ごとの成功/失敗を集計して
 * csv_importsに履歴として残す。
 *
 * mode="add"の場合、既に存在するplatform_freelancer_idの行は(誤って既存データを
 * 上書きしないよう)スキップする。事前にDB内の既存ID一覧を1回だけ取得して判定する。
 *
 * このページはadmin限定(SCREEN_SPEC.md 9章)のため、サーバー側でも確認する。
 */
export async function importFreelancersCsv(
  fileName: string,
  rows: Record<string, string | undefined>[],
  mode: FreelancerImportMode
): Promise<ImportFreelancersCsvResult> {
  const authCheck = await requireAdmin();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return { success: false, error: "ログイン機能が未実装のため、CSVインポートは利用できません。" };
  }

  const supabase = await createSupabaseServerClient();

  let existingIds: Set<string> | null = null;
  if (mode === "add") {
    const { data: existing, error: existingError } = await supabase
      .from("freelancers")
      .select("platform_freelancer_id");
    if (existingError) {
      return { success: false, error: `既存データの確認に失敗しました: ${existingError.message}` };
    }
    existingIds = new Set((existing ?? []).map((row) => row.platform_freelancer_id));
  }

  const errorLog: { row: number; message: string }[] = [];
  let successCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const parsed = parseFreelancerCsvRow(rows[i]);
    if (!parsed.ok) {
      errorLog.push({ row: i + 1, message: parsed.error });
      continue;
    }

    if (existingIds?.has(parsed.data.platform_freelancer_id)) {
      skippedCount++;
      continue;
    }

    const { error } = await supabase
      .from("freelancers")
      .upsert(
        {
          platform_freelancer_id: parsed.data.platform_freelancer_id,
          name: parsed.data.name,
          email: parsed.data.email,
          job_categories: parsed.data.job_categories,
          last_imported_at: new Date().toISOString(),
        },
        { onConflict: "platform_freelancer_id" }
      );

    if (error) {
      errorLog.push({ row: i + 1, message: error.message });
    } else {
      successCount++;
    }
  }

  const { error: historyError } = await supabase.from("csv_imports").insert({
    target_table: "freelancers",
    file_name: fileName,
    imported_by: currentUserId,
    row_count: rows.length,
    success_count: successCount,
    error_count: errorLog.length,
    error_log: errorLog.length > 0 ? errorLog : null,
  });

  if (historyError) {
    return { success: false, error: `インポート履歴の保存に失敗しました: ${historyError.message}` };
  }

  revalidatePath("/freelancers");
  return {
    success: true,
    rowCount: rows.length,
    successCount,
    skippedCount,
    errorCount: errorLog.length,
    errorLog,
  };
}
