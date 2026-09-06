import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  // 公開問い合わせフォーム(/contact/[number]、認証不要。public-contact-form.tsx参照)。
  "/contact",
  // 外部サービスからのWebhook(CloudSign/AssemblyAI/Slack/フォーム)。Supabaseの
  // セッションCookieを持たない外部からのPOSTのため、各route内で共有シークレット・
  // 署名等により個別に検証している(ここで弾くとリダイレクトになり全て失敗する)。
  "/api/webhooks",
  // 公開フォームの構成取得API(GET、CORS許可済み・認証不要。schema/route.ts参照)。
  "/api/forms",
  // Vercel Cron(CRON_SECRETで各route内検証、セッションCookieは付与されない)。
  "/api/cron",
];

/**
 * Supabase SSRの標準パターン: 毎リクエストでセッションCookieを更新しつつ、
 * 未ログインで(app)配下にアクセスした場合は/loginへ、
 * ログイン済みで/loginにアクセスした場合は/dashboardへリダイレクトする。
 *
 * Supabase未接続(.env未設定)の間は素通しする(isSupabaseConfiguredと同じ判定)。
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
