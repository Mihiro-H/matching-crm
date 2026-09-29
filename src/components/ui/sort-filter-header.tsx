"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListFilter, X } from "lucide-react";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { computePopoverPosition } from "@/lib/popover-position";

// テキスト絞り込みポップオーバーのおおよその幅(px)。画面右端からはみ出さないよう位置を補正するのに使う。
const TEXT_FILTER_POPOVER_WIDTH = 240;

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
  // nullのときはポップオーバーを閉じている
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [textValue, setTextValue] = useState(filter?.type === "text" ? (filter.value ?? "") : "");
  const popoverRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const isPopoverOpen = popoverPosition !== null;

  useEffect(() => {
    if (!isPopoverOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // 起点ボタン自身のクリックはonClick側のトグルに任せる(ここで閉じると直後に開き直してしまう)
      if (popoverRef.current?.contains(target) || filterButtonRef.current?.contains(target)) return;
      setPopoverPosition(null);
    }
    // ポップオーバーは画面座標で固定配置しているため、テーブルや画面がスクロール・リサイズされたら
    // 起点ボタンとずれないよう閉じる
    function handleViewportChange(event: Event) {
      if (popoverRef.current?.contains(event.target as Node)) return;
      setPopoverPosition(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [isPopoverOpen]);

  function togglePopover() {
    if (isPopoverOpen) {
      setPopoverPosition(null);
      return;
    }
    const button = filterButtonRef.current;
    if (!button) return;
    setPopoverPosition(
      computePopoverPosition(button.getBoundingClientRect(), { width: TEXT_FILTER_POPOVER_WIDTH }, window.innerWidth)
    );
  }

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
    setPopoverPosition(null);
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
    <th className="px-4 py-3 font-medium text-neutral-600">
      <div className="flex items-center gap-1">
        <Link href={sortHref} className="hover:text-primary-600">
          {label}
          {isSorted && (sortDir === "asc" ? " ▲" : " ▼")}
        </Link>
        {filter && (
          <button
            ref={filterButtonRef}
            type="button"
            onClick={() => (filter.type === "text" ? togglePopover() : setShowModal(true))}
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

      {/*
        テーブルはTableScrollArea内でスクロールするため、th内に置くと枠で切れて見えなくなる。
        document.bodyへポータルし、起点ボタンの画面座標にfixedで配置する。
      */}
      {filter?.type === "text" &&
        popoverPosition &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-50"
            style={{ top: popoverPosition.top, left: popoverPosition.left }}
          >
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
          </div>,
          document.body
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
