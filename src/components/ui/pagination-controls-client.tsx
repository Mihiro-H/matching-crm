"use client";

// 一度に表示するページ番号ボタンの最大数(PaginationControlsと同じ方針)。
const MAX_PAGE_LINKS = 5;

/**
 * テーブル形式の一覧共通のページネーション(クライアント側版)。
 * ユーザー管理・個人別権限設定のように、一覧を既にクライアント側でフルフェッチ済みで
 * React stateだけで絞り込み・ページングしている画面向け(PaginationControlsとの違いは
 * URL遷移ではなくonPageChangeコールバックでページstateを更新する点のみ)。
 */
export function PaginationControlsClient({
  page,
  totalCount,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
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
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-neutral-200 px-3 py-1.5 hover:bg-page-bg disabled:border-neutral-100 disabled:text-neutral-400 disabled:hover:bg-transparent"
        >
          前へ
        </button>
        {pageNumbers.map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => onPageChange(n)}
            className={`rounded-md px-3 py-1.5 ${
              n === page ? "bg-primary-500 text-neutral-0" : "border border-neutral-200 hover:bg-page-bg"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-neutral-200 px-3 py-1.5 hover:bg-page-bg disabled:border-neutral-100 disabled:text-neutral-400 disabled:hover:bg-transparent"
        >
          次へ
        </button>
      </div>
    </div>
  );
}
