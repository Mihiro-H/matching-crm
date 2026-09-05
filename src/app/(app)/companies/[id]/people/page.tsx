import Link from "next/link";
import { getCompanyPeople } from "@/lib/companies/get-company-people";

export default async function CompanyPeopleTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { people, error } = await getCompanyPeople(id);

  if (error) {
    return <p className="text-sm text-danger-text">担当者の取得に失敗しました: {error}</p>;
  }

  if (people.length === 0) {
    return <p className="text-sm text-neutral-600">この企業の担当者はまだ登録されていません。</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-neutral-600">
            <th className="px-4 py-3 font-medium">担当者名</th>
            <th className="px-4 py-3 font-medium">メール</th>
            <th className="px-4 py-3 font-medium">電話番号</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3">
                <Link href={`/people/${person.id}`} className="text-primary-600 hover:underline">
                  {person.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-600">{person.email ?? "-"}</td>
              <td className="px-4 py-3 text-neutral-600">{person.phone ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
