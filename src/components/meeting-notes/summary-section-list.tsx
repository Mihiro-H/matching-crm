import type { SummarySections } from "@/lib/meeting-notes/summary-sections";

const SUMMARY_SECTION_LABELS: Record<keyof SummarySections, string> = {
  keyPoints: "要点",
  decisions: "決議事項",
  nextActions: "ネクストアクション",
};

/** AI要約の3分類(要点/決議事項/ネクストアクション)を箇条書きで表示する(閲覧専用)。 */
export function SummarySectionList({ sections }: { sections: SummarySections }) {
  return (
    <div className="mt-2 flex flex-col gap-3">
      {(Object.keys(SUMMARY_SECTION_LABELS) as (keyof SummarySections)[]).map((key) => (
        <div key={key}>
          <p className="text-xs text-neutral-600">{SUMMARY_SECTION_LABELS[key]}</p>
          {sections[key].length > 0 ? (
            <ul className="mt-1 list-disc pl-5 text-sm text-neutral-900">
              {sections[key].map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-neutral-400">特になし</p>
          )}
        </div>
      ))}
    </div>
  );
}
