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
      <body className="min-h-full flex flex-col font-sans text-base">
        {children}
      </body>
    </html>
  );
}
