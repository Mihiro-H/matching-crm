"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { debounce } from "@/lib/debounce";
import type { SearchResultItem } from "@/lib/search-select/actions";

export type { SearchResultItem };

type SearchSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
  mode: "single" | "multiple";
  search: (query: string) => Promise<SearchResultItem[]>;
  onConfirm: (selected: SearchResultItem[]) => void | Promise<void>;
  confirmLabel?: string;
  /**
   * 検索してもヒットしない場合に表示する新規登録フロー
   * (SCREEN_SPEC.md「共通UIパターン」: 企業選択の場合のみ)。
   */
  createNew?: {
    label: (query: string) => string;
    render: (query: string, onCreated: (item: SearchResultItem) => void) => React.ReactNode;
  };
};

/**
 * SCREEN_SPEC.md「共通UIパターン: 検索選択モーダル」の汎用実装。
 * 企業選択・社内担当者選択・フリーランス選択のすべてでこのコンポーネントを使う。
 */
export function SearchSelectModal({
  isOpen,
  onClose,
  title,
  placeholder,
  mode,
  search,
  onConfirm,
  confirmLabel = "アサイン",
  createNew,
}: SearchSelectModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<Map<string, SearchResultItem>>(new Map());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useMemo(
    () =>
      debounce((q: string) => {
        setIsSearching(true);
        search(q)
          .then((items) => {
            setResults(items);
            setError(null);
          })
          .catch((err: unknown) => {
            setError(err instanceof Error ? err.message : "検索に失敗しました");
            setResults([]);
          })
          .finally(() => setIsSearching(false));
      }, 300),
    [search]
  );

  useEffect(() => {
    if (!isOpen) return;
    debouncedSearch(query);
  }, [query, isOpen, debouncedSearch]);

  // isOpen が閉じた瞬間にレンダー中で内部状態をリセットする
  // (React公式の「propの変化に応じてstateを調整する」パターン。
  //  useEffect内でのsetStateはカスケードレンダーを招くため避ける)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setQuery("");
      setResults(null);
      setSelected(new Map());
      setShowCreateForm(false);
      setError(null);
    }
  }

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleRowClick(item: SearchResultItem) {
    if (mode === "single") {
      onConfirm([item]);
      onClose();
      return;
    }
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item);
      }
      return next;
    });
  }

  function handleCreated(item: SearchResultItem) {
    setShowCreateForm(false);
    if (mode === "single") {
      onConfirm([item]);
      onClose();
      return;
    }
    setSelected((prev) => new Map(prev).set(item.id, item));
    setQuery("");
  }

  // ページ内の<form>から呼ばれるケースがある(企業/担当者選択モーダル等)。ポータルを
  // 使わずインラインでレンダーすると、createNew.render()の中身(CreateCompanyInlineForm
  // 等、これ自体も<form>)がその外側の<form>にネストしてしまい、ネストされた<form>内の
  // 送信ボタンを押すとブラウザのネイティブ送信(ページ遷移)が起きてReactのonSubmitが
  // 効かなくなる不具合が実際に発生した。document.bodyへポータルすることで、
  // モーダルの中身が常にどの<form>の外側にも置かれるようにして回避する。
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-neutral-0 shadow-md"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 p-4">
          <h2 className="text-md text-neutral-900">{title}</h2>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="rounded-full p-1 text-neutral-600 hover:bg-page-bg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {error && <p className="px-2 py-2 text-sm text-danger-text">{error}</p>}

          {showCreateForm && createNew ? (
            createNew.render(query, handleCreated)
          ) : (
            <ul>
              {results?.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleRowClick(item)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-page-bg"
                  >
                    {mode === "multiple" && (
                      <input
                        type="checkbox"
                        readOnly
                        checked={selected.has(item.id)}
                        className="h-4 w-4 accent-primary-500"
                      />
                    )}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-600">
                      {item.label.slice(0, 1)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-neutral-900">{item.label}</span>
                      {item.sublabel && (
                        <span className="block truncate text-xs text-neutral-600">{item.sublabel}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}

              {!isSearching && results?.length === 0 && !createNew && (
                <li className="px-2 py-4 text-center text-sm text-neutral-600">該当なし</li>
              )}

              {!isSearching && results?.length === 0 && createNew && query.trim() && (
                <li>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="w-full rounded-md px-2 py-2 text-left text-sm text-primary-600 hover:bg-page-bg"
                  >
                    {createNew.label(query.trim())}
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        {mode === "multiple" && !showCreateForm && (
          <div className="flex items-center justify-between border-t border-neutral-100 p-4">
            <span className="text-xs text-neutral-600">{selected.size}件選択中</span>
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={async () => {
                await onConfirm(Array.from(selected.values()));
                onClose();
              }}
              className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
