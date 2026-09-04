"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListFilter, X } from "lucide-react";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";

export type TextFilterConfig = {
  type: "text";
  value: string | null;
  placeholder: string;
  /** このフィルターが使うURLクエリパラメータ名(例: "name") */
  paramName: string;
};

export type PersonFilterConfig = {
  type: "person";
  value: { id: string; name: string } | null;
  modalTitle: string;
  /** "use server"のServer Action(値ではなく関数だが、これはクライアントに渡せる唯一の例外)。 */
  search: (query: string) => Promise<SearchResultItem[]>;
  idParamName: string;
  nameParamName: string;
};

/**
 * 企業一覧・案件管理・商談担当者管理の共通テーブル見出し(SCREEN_SPEC.md各章)。
 * ラベルクリックでソート、フィルターアイコンクリックで絞り込み
 * (テキスト列は検索入力のポップオーバー、人物列は「フリーランスをアサイン」と
 * 同じSearchSelectModal)を提供する。
 *
 * サーバーコンポーネント(各一覧ページ)からは`buildHref`のような関数を直接渡せない
 * ("use server"を付けたServer Action以外の関数はクライアントコンポーネントへ渡せない
 * というNext.jsの制約)ため、`basePath`+`currentQuery`という素のデータだけを受け取り、
 * URLの組み立てはこのコンポーネント自身がクライアント側で行う。
 */
export function SortFilterHeader({
  label,
  sortHref,
  isSorted,
  sortDir,
  basePath,
  currentQuery,
  filter,
}: {
  label: string;
  sortHref: string;
  isSorted: boolean;
  sortDir: "asc" | "desc";
  basePath: string;
  currentQuery: Record<string, string>;
  filter?: TextFilterConfig | PersonFilterConfig;
}) {
  const router = useRouter();
  const [showPopover, setShowPopover] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [textValue, setTextValue] = useState(filter?.type === "text" ? (filter.value ?? "") : "");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPopover) return;
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPopover]);

  const isFilterActive = filter ? filter.value !== null : false;

  function buildHref(overrides: Record<string, string | null>): string {
    const next = new URLSearchParams(currentQuery);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    return `${basePath}?${next.toString()}`;
  }

  function handleTextApply(e: React.FormEvent) {
    e.preventDefault();
    if (filter?.type !== "text") return;
    setShowPopover(false);
    const value = textValue.trim() || null;
    router.push(buildHref({ [filter.paramName]: value }));
  }

  function handleClear() {
    if (!filter) return;
    if (filter.type === "text") {
      router.push(buildHref({ [filter.paramName]: null }));
    } else {
      router.push(buildHref({ [filter.idParamName]: null, [filter.nameParamName]: null }));
    }
  }

  return (
    <th className="relative px-4 py-3 font-medium text-neutral-600">
      <div className="flex items-center gap-1">
        <Link href={sortHref} className="hover:text-primary-600">
          {label}
          {isSorted && (sortDir === "asc" ? " ▲" : " ▼")}
        </Link>
        {filter && (
          <button
            type="button"
            onClick={() => (filter.type === "text" ? setShowPopover((v) => !v) : setShowModal(true))}
            aria-label={`${label}で絞り込み`}
            className={isFilterActive ? "text-primary-600" : "text-neutral-400 hover:text-neutral-600"}
          >
            <ListFilter size={12} />
          </button>
        )}
        {isFilterActive && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="絞り込み解除"
            className="text-neutral-400 hover:text-danger-text"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {filter?.type === "text" && showPopover && (
        <div ref={popoverRef} className="absolute left-0 top-full z-20 mt-1">
          <form
            onSubmit={handleTextApply}
            className="flex gap-1 rounded-md border border-neutral-200 bg-neutral-0 p-2 shadow-md"
          >
            <input
              autoFocus
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder={filter.placeholder}
              className="w-40 rounded-md border border-neutral-200 bg-neutral-0 px-2 py-1 text-xs font-normal text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            <button
              type="submit"
              className="whitespace-nowrap rounded-md bg-primary-500 px-2 py-1 text-xs font-normal text-neutral-0"
            >
              適用
            </button>
          </form>
        </div>
      )}

      {filter?.type === "person" && (
        <SearchSelectModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={filter.modalTitle}
          placeholder="氏名で検索"
          mode="single"
          search={filter.search}
          onConfirm={(items) => {
            const [item] = items;
            if (!item) return;
            router.push(buildHref({ [filter.idParamName]: item.id, [filter.nameParamName]: item.label }));
          }}
        />
      )}
    </th>
  );
}
