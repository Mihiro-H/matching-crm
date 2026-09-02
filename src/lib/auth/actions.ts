"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "./safe-redirect";

/** ログイン画面(SCREEN_SPEC.md 0章)の「Googleでログイン」ボタン */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const headerList = await headers();
  const origin = headerList.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const next = getSafeRedirectPath(formData.get("next") as string | null);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth_start_failed");
  }

  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
