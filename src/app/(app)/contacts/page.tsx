import Link from "next/link";
import { getContacts } from "@/lib/contacts/get-contacts";
import { CONTACT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { JOB_CATEGORY_LABELS } from "@/lib/job-categories";
import { formatElapsedTime } from "@/lib/elapsed-time";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { ContactStatus } from "@/lib/supabase/database.types";

// SCREEN_SPEC.md 2章: ステータスフィルターのチップ(すべて/未対応/対応中/商談中)
const STATUS_FILTER_CHIPS: { label: string; value: ContactStatus | null }[] = [
  { label: "すべて", value: null },
  { label: "未対応", value: "new" },
  { label: "対応中", value: "in_progress" },
  { label: "商談中", value: "negotiating" },
];

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  const { status } = await searchParams;
  const statusFilter = STATUS_FILTER_CHIPS.some((chip) => chip.value === status)
    ? (status as ContactStatus)
    : null;

  const { contacts, error } = await getContacts(statusFilter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {STATUS_FILTER_CHIPS.map((chip) => {
          const isActive = statusFilter === chip.value;
          const href = chip.value ? `/contacts?status=${chip.value}` : "/contacts";
          return (
            <Link
              key={chip.label}
              href={href}
              className={`rounded-full px-3 py-1 text-sm ${
                isActive
                  ? "bg-primary-500 text-neutral-0"
                  : "border border-neutral-200 text-neutral-600 hover:bg-page-bg"
              }`}
            >
              {chip.label}
            </Link>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-danger-bg bg-danger-bg p-4 text-sm text-danger-text">
          一覧の取得に失敗しました: {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {contacts.map((contact) => (
          <Link
            key={contact.id}
            href={`/contacts/${contact.id}`}
            className="rounded-lg border border-neutral-200 bg-neutral-0 p-4 hover:border-primary-500"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-md text-neutral-900">{contact.companyName}</h3>
              <StatusBadge meta={CONTACT_STATUS_META[contact.status]} />
            </div>
            <p className="mt-1 text-xs text-neutral-600">
              {SOURCE_LABELS[contact.source] ?? contact.source} ・ {formatElapsedTime(contact.createdAt)}
            </p>
            {contact.jobCategories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {contact.jobCategories.map((category) => (
                  <span
                    key={category}
                    className="rounded-sm bg-page-bg px-2 py-0.5 text-xs text-neutral-600"
                  >
                    {JOB_CATEGORY_LABELS[category]}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-neutral-600">
              担当者: {contact.assigneeName ?? "未アサイン"}
            </p>
          </Link>
        ))}

        {contacts.length === 0 && !error && (
          <p className="col-span-3 py-8 text-center text-sm text-neutral-600">
            該当する商談・問い合わせはありません。
          </p>
        )}
      </div>
    </div>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  form: "フォーム",
  referral: "紹介",
  other: "その他",
};

function SupabaseNotConfiguredNotice() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
      <h2 className="text-lg text-neutral-900">Supabase未接続です</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Supabaseの接続情報を .env に設定すると、一覧が表示されます。
      </p>
    </div>
  );
}
