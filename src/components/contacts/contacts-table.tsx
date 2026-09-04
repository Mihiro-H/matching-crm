import Link from "next/link";
import {
  CONTACT_SORTABLE_COLUMNS,
  nextSortDirection,
  type ContactSortColumn,
  type ContactsListParams,
} from "@/lib/contacts/list-params";
import type { ContactListRow } from "@/lib/contacts/get-contacts";
import { CONTACT_STATUS_META } from "@/lib/status-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { SortFilterHeader } from "@/components/ui/sort-filter-header";
import { searchUsers } from "@/lib/search-select/actions";
import { JOB_CATEGORY_LABELS, JOB_CATEGORY_TAG_STYLES } from "@/lib/job-categories";
import { formatDateJa } from "@/lib/format";

const COLUMN_LABELS: Record<ContactSortColumn, string> = {
  company: "企業名",
  name: "担当者名",
  status: "ステータス",
  source: "流入経路",
  assignee: "主担当",
  createdAt: "初回問合せ日",
};

const SOURCE_LABELS: Record<string, string> = {
  form: "フォーム",
  referral: "紹介",
  other: "その他",
};

export function ContactsTable({
  contacts,
  params,
}: {
  contacts: ContactListRow[];
  params: ContactsListParams;
}) {
  function hrefFor(overrides: { sort?: ContactSortColumn }) {
    const next = new URLSearchParams();
    next.set("sort", overrides.sort ?? params.sortBy);
    next.set("dir", overrides.sort ? nextSortDirection(params, overrides.sort) : params.sortDir);
    if (params.statusFilter) next.set("status", params.statusFilter);
    if (params.companyNameFilter) next.set("companyName", params.companyNameFilter);
    if (params.nameFilter) next.set("name", params.nameFilter);
    if (params.assigneeFilter) {
      next.set("assigneeId", params.assigneeFilter.id);
      next.set("assigneeName", params.assigneeFilter.name);
    }
    return `/contacts?${next.toString()}`;
  }

  // SortFilterHeaderはクライアントコンポーネントのため、関数(hrefFor)ではなく
  // 素のデータだけを渡す("use server"以外の関数はクライアントへ渡せないため)。
  const currentQuery: Record<string, string> = { sort: params.sortBy, dir: params.sortDir };
  if (params.statusFilter) currentQuery.status = params.statusFilter;
  if (params.companyNameFilter) currentQuery.companyName = params.companyNameFilter;
  if (params.nameFilter) currentQuery.name = params.nameFilter;
  if (params.assigneeFilter) {
    currentQuery.assigneeId = params.assigneeFilter.id;
    currentQuery.assigneeName = params.assigneeFilter.name;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100">
            {CONTACT_SORTABLE_COLUMNS.map((column) => (
              <SortFilterHeader
                key={column}
                label={COLUMN_LABELS[column]}
                sortHref={hrefFor({ sort: column })}
                isSorted={params.sortBy === column}
                sortDir={params.sortDir}
                basePath="/contacts"
                currentQuery={currentQuery}
                filter={
                  column === "company"
                    ? {
                        type: "text",
                        value: params.companyNameFilter,
                        placeholder: "企業名で検索",
                        paramName: "companyName",
                      }
                    : column === "name"
                      ? {
                          type: "text",
                          value: params.nameFilter,
                          placeholder: "担当者名で検索",
                          paramName: "name",
                        }
                      : column === "assignee"
                        ? {
                            type: "person",
                            value: params.assigneeFilter,
                            modalTitle: "主担当で絞り込み",
                            search: searchUsers,
                            idParamName: "assigneeId",
                            nameParamName: "assigneeName",
                          }
                        : undefined
                }
              />
            ))}
            <th className="px-4 py-3 font-medium text-neutral-600">依頼職種</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3 text-neutral-600">{contact.companyName}</td>
              <td className="px-4 py-3">
                <Link href={`/contacts/${contact.id}`} className="text-primary-600 hover:underline">
                  {contact.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge meta={CONTACT_STATUS_META[contact.status]} />
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {SOURCE_LABELS[contact.source] ?? contact.source}
              </td>
              <td className="px-4 py-3 text-neutral-600">{contact.assigneeName ?? "未アサイン"}</td>
              <td className="px-4 py-3 text-neutral-600">{formatDateJa(contact.createdAt)}</td>
              <td className="px-4 py-3">
                {contact.jobCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {contact.jobCategories.map((category) => (
                      <span
                        key={category}
                        className={`rounded-sm px-2 py-0.5 text-xs ${JOB_CATEGORY_TAG_STYLES[category]}`}
                      >
                        {JOB_CATEGORY_LABELS[category]}
                      </span>
                    ))}
                  </div>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
          {contacts.length === 0 && (
            <tr>
              <td colSpan={CONTACT_SORTABLE_COLUMNS.length + 1} className="px-4 py-8 text-center text-neutral-600">
                該当する商談・問い合わせはありません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
