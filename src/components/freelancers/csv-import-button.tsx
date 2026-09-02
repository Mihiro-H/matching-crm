"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { importFreelancersCsv, type ImportFreelancersCsvResult } from "@/lib/freelancers/actions";

export function CsvImportButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportFreelancersCsvResult | null>(null);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse<Record<string, string | undefined>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        const importResult = await importFreelancersCsv(file.name, parsed.data);
        setResult(importResult);
        setIsImporting(false);
        if (importResult.success) router.refresh();
      },
      error: (err: Error) => {
        setResult({ success: false, error: err.message });
        setIsImporting(false);
      },
    });

    e.target.value = "";
  }

  return (
    <>
      <button
        type="button"
        disabled={isImporting}
        onClick={() => inputRef.current?.click()}
        className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
      >
        {isImporting ? "インポート中..." : "CSVで一括更新"}
      </button>
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFileSelected} className="hidden" />

      {result && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setResult(null);
          }}
        >
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg bg-neutral-0 p-6 shadow-md">
            <h2 className="text-md text-neutral-900">インポート結果</h2>
            {result.success ? (
              <div className="mt-3 text-sm">
                <p className="text-neutral-900">
                  {result.rowCount}行中 <span className="text-success-text">{result.successCount}件成功</span>
                  {result.errorCount > 0 && (
                    <>
                      ・<span className="text-danger-text">{result.errorCount}件エラー</span>
                    </>
                  )}
                </p>
                {result.errorLog.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1">
                    {result.errorLog.map((e) => (
                      <li key={e.row} className="text-xs text-danger-text">
                        {e.row}行目: {e.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-danger-text">{result.error}</p>
            )}
            <button
              type="button"
              onClick={() => setResult(null)}
              className="mt-4 rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-page-bg"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
