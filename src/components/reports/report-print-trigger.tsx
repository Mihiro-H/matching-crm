"use client";

import { useEffect } from "react";

/**
 * 印刷用ページのマウント時にブラウザの印刷ダイアログを自動で開く。
 * ready=falseの場合(実行結果がまだない)は印刷せず、内容を確認できるようにする。
 */
export function ReportPrintTrigger({ ready }: { ready: boolean }) {
  useEffect(() => {
    if (!ready) return;
    window.print();
  }, [ready]);

  return null;
}
