-- Misoca連携(見積書・請求書のPDF発行、精算管理)用のOAuthトークン保管テーブル。
-- 自社の1つのMisocaアカウントとだけ連携する想定のため、idをboolean(常にtrue)にして
-- 1行しか存在できないシングルトンにする。
--
-- リフレッシュトークンは長期間有効な強い認証情報のため、authenticatedロールへは
-- 一切ポリシーを与えない(notificationsテーブルの「本人限定」よりさらに厳しく、
-- 誰にも読ませない)。service role権限のadminクライアント経由でのみ読み書きする。
create table public.misoca_oauth_tokens (
  id boolean primary key default true,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  connected_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint misoca_oauth_tokens_singleton check (id)
);

create trigger set_updated_at
  before update on public.misoca_oauth_tokens
  for each row execute function public.set_updated_at();

alter table public.misoca_oauth_tokens enable row level security;
-- 意図的にauthenticatedロール向けのポリシーを1つも作らない(全面拒否)。
