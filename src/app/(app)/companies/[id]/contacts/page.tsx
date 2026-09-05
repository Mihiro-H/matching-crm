import Link from "next/link";
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
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-neutral-600">
            <th className="px-4 py-3 font-medium">担当者名</th>
            <th className="px-4 py-3 font-medium">連絡先</th>
            <th className="px-4 py-3 font-medium">在任期間</th>
            <th className="px-4 py-3 font-medium">状態</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3">
                <Link href={`/contacts/${contact.id}`} className="text-primary-600 hover:underline">
                  {contact.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {contact.email ?? "メール未登録"}
                {contact.phone ? ` ・ ${contact.phone}` : ""}
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {contact.started_at ? formatDateJa(contact.started_at) : "-"}
                {" 〜 "}
                {contact.ended_at ? formatDateJa(contact.ended_at) : "現在"}
              </td>
              <td className="px-4 py-3">
                {contact.is_current ? (
                  <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs text-success-text">
                    現在の窓口
                  </span>
                ) : (
                  <span className="text-xs text-neutral-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
