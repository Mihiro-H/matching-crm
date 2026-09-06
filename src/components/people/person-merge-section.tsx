"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchSelectModal, type SearchResultItem } from "@/components/ui/search-select-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { searchPeople } from "@/lib/search-select/actions";
import { getPersonForMerge, mergePeople, type MergeCandidatePerson } from "@/lib/people/actions";
import type { PersonDetail } from "@/lib/people/get-person";

type FieldChoice = "keep" | "other";
type FieldChoices = { name: FieldChoice; email: FieldChoice; phone: FieldChoice; company: FieldChoice };

const EMPTY_LABEL = "(未登録)";

/**
 * 重複担当者の統合(SCREEN_SPEC.md「担当者一覧」)。
 * duplicate_person_emailの通知から遷移してきた場合を主な想定だが、この担当者詳細画面から
 * いつでも起動できる。統合先(消える側)を選ぶ→項目ごとにどちらの値を残すか選ぶ→確認、の3段階。
 */
export function PersonMergeSection({ person, canEdit }: { person: PersonDetail; canEdit: boolean }) {
  const router = useRouter();
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [other, setOther] = useState<MergeCandidatePerson | null>(null);
  const [choices, setChoices] = useState<FieldChoices>({ name: "keep", email: "keep", phone: "keep", company: "keep" });
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) return null;

  async function handleSelectOther(items: SearchResultItem[]) {
    const [item] = items;
    if (!item) return;
    setError(null);
    const candidate = await getPersonForMerge(item.id);
    if (!candidate) {
      setError("担当者データの取得に失敗しました。");
      return;
    }
    setOther(candidate);
    setChoices({ name: "keep", email: "keep", phone: "keep", company: "keep" });
  }

  function handleCancelMerge() {
    setOther(null);
    setError(null);
  }

  async function handleConfirmMerge() {
    if (!other) return;
    setIsSubmitting(true);
    setError(null);
    const result = await mergePeople({ keepId: person.id, otherId: other.id, ...choices });
    setIsSubmitting(false);
    setShowConfirm(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOther(null);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-md text-neutral-900">重複データの統合</h3>
        {!other && (
          <button
            type="button"
            onClick={() => setShowSelectModal(true)}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-page-bg"
          >
            統合する担当者を選ぶ
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-neutral-600">
        同一人物の重複データが他にもある場合、この担当者に統合できます。統合すると、選んだ相手の商談は
        すべてこの担当者に付け替わり、相手のデータは削除されます(商談自体は削除されません)。
      </p>

      {error && <p className="mt-3 text-sm text-danger-text">{error}</p>}

      {other && (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            「{other.name}」と統合します(この担当者の商談 {other.dealCount}件が付け替わります)。
            項目ごとに残す値を選んでください。
          </p>

          <div className="overflow-x-auto rounded-md border border-neutral-100">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-600">
                  <th className="px-3 py-2 font-medium">項目</th>
                  <th className="px-3 py-2 font-medium">この担当者(残す)</th>
                  <th className="px-3 py-2 font-medium">{other.name}(統合される側)</th>
                </tr>
              </thead>
              <tbody>
                <FieldChoiceRow
                  label="担当者名"
                  fieldKey="name"
                  keepValue={person.name}
                  otherValue={other.name}
                  choice={choices.name}
                  onChange={(value) => setChoices((prev) => ({ ...prev, name: value }))}
                />
                <FieldChoiceRow
                  label="メール"
                  fieldKey="email"
                  keepValue={person.email}
                  otherValue={other.email}
                  choice={choices.email}
                  onChange={(value) => setChoices((prev) => ({ ...prev, email: value }))}
                />
                <FieldChoiceRow
                  label="電話番号"
                  fieldKey="phone"
                  keepValue={person.phone}
                  otherValue={other.phone}
                  choice={choices.phone}
                  onChange={(value) => setChoices((prev) => ({ ...prev, phone: value }))}
                />
                <FieldChoiceRow
                  label="企業"
                  fieldKey="company"
                  keepValue={person.companyName}
                  otherValue={other.companyName}
                  choice={choices.company}
                  onChange={(value) => setChoices((prev) => ({ ...prev, company: value }))}
                />
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowConfirm(true)}
              className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
            >
              この内容で統合する
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCancelMerge}
              className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-page-bg disabled:opacity-40"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <SearchSelectModal
        isOpen={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        title="統合する担当者を選択"
        placeholder="担当者名で検索"
        mode="single"
        search={searchPeople}
        confirmLabel="選択"
        onConfirm={async (items) => {
          setShowSelectModal(false);
          await handleSelectOther(items);
        }}
      />

      <ConfirmDialog
        isOpen={showConfirm}
        title="担当者を統合しますか?"
        message={`「${other?.name ?? ""}」のデータを削除し、選んだ内容でこの担当者に統合します。この操作は取り消せません。`}
        confirmLabel="統合する"
        cancelLabel="キャンセル"
        onConfirm={handleConfirmMerge}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

function FieldChoiceRow({
  label,
  fieldKey,
  keepValue,
  otherValue,
  choice,
  onChange,
}: {
  label: string;
  fieldKey: string;
  keepValue: string | null;
  otherValue: string | null;
  choice: FieldChoice;
  onChange: (value: FieldChoice) => void;
}) {
  return (
    <tr className="border-b border-neutral-100 last:border-0">
      <td className="px-3 py-2 align-top text-neutral-600">{label}</td>
      <td className="px-3 py-2 align-top">
        <label className="flex items-start gap-2 text-neutral-900">
          <input
            type="radio"
            name={`merge-${fieldKey}`}
            checked={choice === "keep"}
            onChange={() => onChange("keep")}
            className="mt-0.5 h-4 w-4 text-primary-500 focus:ring-primary-100"
          />
          {keepValue || EMPTY_LABEL}
        </label>
      </td>
      <td className="px-3 py-2 align-top">
        <label className="flex items-start gap-2 text-neutral-900">
          <input
            type="radio"
            name={`merge-${fieldKey}`}
            checked={choice === "other"}
            onChange={() => onChange("other")}
            className="mt-0.5 h-4 w-4 text-primary-500 focus:ring-primary-100"
          />
          {otherValue || EMPTY_LABEL}
        </label>
      </td>
    </tr>
  );
}
