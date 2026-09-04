import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbit",
  description: "発注企業アカウント管理CRM",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      {/*
        suppressHydrationWarning: ColorZillaなど一部のブラウザ拡張機能が<body>に
        cz-shortcut-listen等の属性をハイドレーション前に注入し、無害なはずの差分を
        Reactがハイドレーションミスマッチとして誤検知するための対策(Next.js公式の
        既知の回避策)。実際のコンテンツのミスマッチはこれで隠れないので安全。
      */}
      <body className="min-h-full flex flex-col font-sans text-base" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
