import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16: "middleware" file convention は "proxy" に名称変更された
// (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md参照)。
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 静的アセット・画像最適化・favicon以外の全リクエストにマッチさせる
     * (Supabase SSRの標準パターン)。
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
