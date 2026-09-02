"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Breadcrumb = { label: string; href?: string };

type PageHeaderValue = {
  breadcrumbs: Breadcrumb[] | null;
  setBreadcrumbs: (crumbs: Breadcrumb[] | null) => void;
};

const PageHeaderContext = createContext<PageHeaderValue | null>(null);

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[] | null>(null);
  const value = useMemo(() => ({ breadcrumbs, setBreadcrumbs }), [breadcrumbs]);

  return (
    <PageHeaderContext.Provider value={value}>
      {children}
    </PageHeaderContext.Provider>
  );
}

function usePageHeaderContext() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) {
    throw new Error("usePageHeaderContext must be used within PageHeaderProvider");
  }
  return ctx;
}

export function usePageHeader() {
  return usePageHeaderContext().breadcrumbs;
}

/**
 * 企業詳細・案件詳細など下位階層のページで呼び出し、
 * ヘッダーのパンくず表示を上書きする
 * (例: setPageBreadcrumbs([{ label: "企業一覧", href: "/companies" }, { label: "株式会社アクメ商事" }]))
 */
export function usePageBreadcrumbs(crumbs: Breadcrumb[] | null) {
  const { setBreadcrumbs } = usePageHeaderContext();

  // 文字列化して比較し、配列の再生成による無限ループを避ける
  const key = crumbs ? JSON.stringify(crumbs) : null;

  useEffect(() => {
    setBreadcrumbs(crumbs);
    return () => setBreadcrumbs(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
