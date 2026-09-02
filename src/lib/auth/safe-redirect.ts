const DEFAULT_REDIRECT = "/dashboard";

/**
 * ログイン成功後のリダイレクト先(SCREEN_SPEC.md 0章: 直前にいたページ、
 * なければダッシュボード)。オープンリダイレクト対策として、
 * "/"で始まり"/"や"\"が続かない相対パスのみを許可する
 * (バックスラッシュはブラウザによって"/"に正規化され、"/\evil.com"が
 * "//evil.com"としてプロトコル相対URL扱いされ得るため、先頭以外も含め
 * バックスラッシュを含む文字列はすべて拒否する)。
 */
export function getSafeRedirectPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_REDIRECT;
  if (next.includes("\\")) return DEFAULT_REDIRECT;
  if (!/^\/[^/]/.test(next)) return DEFAULT_REDIRECT;
  if (next === "/login" || next.startsWith("/login/") || next.startsWith("/login?")) {
    return DEFAULT_REDIRECT;
  }
  return next;
}
