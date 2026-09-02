import { getCompanyContactHistory } from "@/lib/companies/get-company-contact-history";
import { formatDateJa } from "@/lib/format";

export default async function CompanyContactHistoryTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { contacts, error } = await getCompanyContactHistory(id);

  if (error) {
    return <p className="text-sm text-danger-text">担当者履歴の取得に失敗しました: {error}</p>;
  }

  if (contacts.length === 0) {
    return <p className="text-sm text-neutral-600">この企業の担当者履歴はまだありません。</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {contacts.map((contact) => (
        <li
          key={contact.id}
          className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-0 p-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-md text-neutral-900">{contact.name}</span>
              {contact.is_current && (
                <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs text-success-text">
                  現在の窓口
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-600">
              {contact.email ?? "メール未登録"}
              {contact.phone ? ` ・ ${contact.phone}` : ""}
            </p>
          </div>
          <p className="text-xs text-neutral-600">
            {contact.started_at ? formatDateJa(contact.started_at) : "-"}
            {" 〜 "}
            {contact.ended_at ? formatDateJa(contact.ended_at) : "現在"}
          </p>
        </li>
      ))}
    </ul>
  );
}
