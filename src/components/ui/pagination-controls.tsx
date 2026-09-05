import Link from "next/link";

// 一度に表示するページ番号リンクの最大数(多すぎると横に長くなるため)。
const MAX_PAGE_LINKS = 5;

/**
 * テーブル形式の一覧共通のページネーション(SCREEN_SPEC.md「一覧共通UI」)。
 * 1ページ20件(lib/pagination.ts参照)・件数表示・前へ/次へ・ページ番号リンクを表示する。
 * サーバーコンポーネントから直接使う(hrefForは各一覧ページの既存のソート/絞り込み用
 * hrefFor関数と同じ考え方で、pageだけ差し替えたURLを組み立てる素の関数)。
 */
export function PaginationControls({
  page,
  totalCount,
  pageSize,
  hrefFor,
}: {
  page: number;
  totalCount: number;
  pageSize: number;
  hrefFor: (page: number) => string;
}) {
  if (totalCount === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  const windowStart = Math.max(1, Math.min(page - Math.floor(MAX_PAGE_LINKS / 2), totalPages - MAX_PAGE_LINKS + 1));
  const pageNumbers = Array.from({ length: Math.min(MAX_PAGE_LINKS, totalPages) }, (_, i) => windowStart + i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3 text-sm text-neutral-600">
      <span>
        全{totalCount}件中 {startItem}-{endItem}件を表示
      </span>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="rounded-md border border-neutral-200 px-3 py-1.5 hover:bg-page-bg">
            前へ
          </Link>
        ) : (
          <span className="rounded-md border border-neutral-100 px-3 py-1.5 text-neutral-400">前へ</span>
        )}
        {pageNumbers.map((n) => (
          <Link
            key={n}
            href={hrefFor(n)}
            className={`rounded-md px-3 py-1.5 ${
              n === page ? "bg-primary-500 text-neutral-0" : "border border-neutral-200 hover:bg-page-bg"
            }`}
          >
            {n}
          </Link>
        ))}
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className="rounded-md border border-neutral-200 px-3 py-1.5 hover:bg-page-bg">
            次へ
          </Link>
        ) : (
          <span className="rounded-md border border-neutral-100 px-3 py-1.5 text-neutral-400">次へ</span>
        )}
      </div>
    </div>
  );
}
