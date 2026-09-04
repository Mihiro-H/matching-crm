import Link from "next/link";
import { getContacts } from "@/lib/contacts/get-contacts";
import { parseContactsListParams } from "@/lib/contacts/list-params";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requirePageAccess } from "@/lib/auth/page-access";
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
  searchParams: Promise<{
    sort?: string;
    dir?: string;
    status?: string;
    companyName?: string;
    name?: string;
    assigneeId?: string;
    assigneeName?: string;
  }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SupabaseNotConfiguredNotice />;
  }

  await requirePageAccess("contacts");

  const resolvedParams = await searchParams;
  const params = parseContactsListParams(resolvedParams);
  const { contacts, error } = await getContacts(params);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {STATUS_FILTER_CHIPS.map((chip) => {
          const isActive = params.statusFilter === chip.value;
          const next = new URLSearchParams();
          next.set("sort", params.sortBy);
          next.set("dir", params.sortDir);
          if (chip.value) next.set("status", chip.value);
          if (params.companyNameFilter) next.set("companyName", params.companyNameFilter);
          if (params.nameFilter) next.set("name", params.nameFilter);
          if (params.assigneeFilter) {
            next.set("assigneeId", params.assigneeFilter.id);
            next.set("assigneeName", params.assigneeFilter.name);
          }
          const href = `/contacts?${next.toString()}`;
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

      {!error && <ContactsTable contacts={contacts} params={params} />}
    </div>
  );
}

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
