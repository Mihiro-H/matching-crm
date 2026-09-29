// テーブルのスクロール領域の高さ上限。画面の高さから、固定ヘッダー(64px)・メインの上下余白(48px)・
// 一覧上部のツールバー・下部のページネーション分を差し引いた値(行が多くてもページネーションが
// 画面内に残るようにするため)。Tailwindはクラス名を静的に解析するため文字列ごと定数にする。
const TABLE_MAX_HEIGHT_CLASS = "max-h-[calc(100dvh-240px)]";

/**
 * テーブル形式の一覧の外枠。行・列が多いときにページ全体ではなくテーブル内だけを
 * 縦・横にスクロールさせ、見出し行は上に固定する(見出しの固定はglobals.cssの
 * .scrollable-table参照)。ページネーション等は<TableScrollArea>の外(=この枠の直下)に置くと、
 * スクロールしても常に見える位置に残る。
 *
 * variant="card": 枠線・角丸付き(一覧ページ単体で置く場合)
 * variant="plain": 枠なし(既にカードの中に置く場合)
 */
export function ScrollableTable({
  variant = "card",
  className = "",
  children,
}: {
  variant?: "card" | "plain";
  className?: string;
  children: React.ReactNode;
}) {
  const frame = variant === "card" ? "overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0" : "";
  return <div className={`flex flex-col ${frame} ${className}`}>{children}</div>;
}

/** <ScrollableTable>の中で<table>を包む、縦・横スクロールする領域。 */
export function TableScrollArea({ children }: { children: React.ReactNode }) {
  return <div className={`scrollable-table overflow-auto ${TABLE_MAX_HEIGHT_CLASS}`}>{children}</div>;
}
