/**
 * Google Driveの企業名フォルダから企業を特定する(SCREEN_SPEC.md 6章 議事録自動取り込み)。
 * あいまい一致(部分一致)は誤った企業に紐付くリスクの方が大きいため使わず、完全一致のみ。
 * マッチしないフォルダは company_id=null のまま取り込み、後で人が手動で紐づける。
 */
export function matchCompanyByFolderName(
  folderName: string,
  companies: { id: string; name: string }[]
): string | null {
  const normalized = folderName.trim();
  return companies.find((c) => c.name.trim() === normalized)?.id ?? null;
}
