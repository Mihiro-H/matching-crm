export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-8">
        <h1 className="text-2xl font-medium text-primary-600">Orbit</h1>
        <p className="mt-2 text-base text-neutral-600">
          プロジェクトのセットアップが完了しました。画面の実装はこれから進めます。
        </p>
        <span className="mt-4 inline-block rounded-sm bg-success-bg px-2 py-1 text-xs text-success-text">
          セットアップ完了
        </span>
      </div>
    </main>
  );
}
