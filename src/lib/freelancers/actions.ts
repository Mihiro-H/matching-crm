"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { parseFreelancerCsvRow } from "./csv-import";

export type ImportFreelancersCsvResult =
  | {
      success: true;
      rowCount: number;
      successCount: number;
      errorCount: number;
      errorLog: { row: number; message: string }[];
    }
  | { success: false; error: string };

/**
 * フリーランスCSVインポート(SCREEN_SPEC.md 9章)。
 * platform_freelancer_idをキーにupsertし、行ごとの成功/失敗を集計して
 * csv_importsに履歴として残す。
 *
 * TODO(auth): 認証未実装のため、imported_by(NOT NULL)に設定できる実ユーザーIDが
 * 存在しない間はこの機能を実行できない。
 */
export async function importFreelancersCsv(
  fileName: string,
  rows: Record<string, string | undefined>[]
): Promise<ImportFreelancersCsvResult> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return { success: false, error: "ログイン機能が未実装のため、CSVインポートは利用できません。" };
  }

  const supabase = await createSupabaseServerClient();
  const errorLog: { row: number; message: string }[] = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const parsed = parseFreelancerCsvRow(rows[i]);
    if (!parsed.ok) {
      errorLog.push({ row: i + 1, message: parsed.error });
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
  return { success: true, rowCount: rows.length, successCount, errorCount: errorLog.length, errorLog };
}
