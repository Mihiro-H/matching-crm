import Link from "next/link";
import { FileSignature, Banknote } from "lucide-react";
import type { TodoItem } from "@/lib/dashboard/dashboard-metrics";
import { formatCurrencyJPY, formatDateJa } from "@/lib/format";

const ICONS = {
  estimate_awaiting_signature: FileSignature,
  invoice_awaiting_payment: Banknote,
} as const;

const TYPE_LABELS = {
  estimate_awaiting_signature: "契約締結待ち",
  invoice_awaiting_payment: "入金確認待ち",
} as const;

export function TodoList({ items }: { items: TodoItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-neutral-600">今日対応が必要な項目はありません。</p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-100">
      {items.map((item) => {
        const Icon = ICONS[item.type];
        return (
          <li key={`${item.type}-${item.id}`}>
            <Link
              href={item.href}
              className="flex items-center gap-3 py-3 hover:bg-page-bg"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning-bg text-warning-text">
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-neutral-900">{item.label}</span>
                <span className="block text-xs text-neutral-600">
                  {TYPE_LABELS[item.type]} ・ {formatDateJa(item.date)}
                </span>
              </span>
              <span className="shrink-0 text-sm text-neutral-900">
                {formatCurrencyJPY(item.amount)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
