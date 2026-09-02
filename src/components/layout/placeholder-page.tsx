// 各画面の実装が済むまでの仮ページ。共通レイアウトの動作確認用。
export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
      <h2 className="text-lg text-neutral-900">{title}</h2>
      <p className="mt-2 text-sm text-neutral-600">{description}</p>
      <span className="mt-4 inline-block rounded-sm bg-info-bg px-2 py-1 text-xs text-info-text">
        実装予定
      </span>
    </div>
  );
}
