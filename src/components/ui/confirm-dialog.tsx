"use client";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * 汎用の確認ポップアップ(見積書・納品書・請求書作成画面で金額を修正した際の
 * 「案件ページの金額も変更しますか?」など、破壊的ではないが確認を挟みたい操作向け)。
 * SearchSelectModalと同じ見た目のダイアログ枠を流用する。
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "変更する",
  cancelLabel = "変更しない",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-neutral-0 p-6 shadow-md"
      >
        <div>
          <h2 className="text-md text-neutral-900">{title}</h2>
          <p className="mt-2 text-sm text-neutral-600">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-page-bg"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
