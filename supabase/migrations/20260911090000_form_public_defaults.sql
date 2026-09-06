-- 問い合わせフォームの公開ページ(/contact/[number])関連の拡張。
-- 1. フォームIDのURL短縮用の連番(deals/projectsと同じ方式、
--    supabase/migrations/20260910130000_deal_project_short_numbers.sql参照)。
-- 2. 公開フォームの右上に表示する自社ロゴ・会社名の設定(シングルトンの1行のみ)。

alter table public.form_definitions add column number bigint generated always as identity;
alter table public.form_definitions add constraint form_definitions_number_unique unique (number);

-- 会社情報(設定 > 会社情報から編集)。id を boolean の true に固定することで、
-- 複数行の作成(誤操作含む)を主キー制約だけで防ぐ(常にちょうど1行だけ存在する)。
create table public.organization_settings (
  id boolean primary key default true,
  company_name text,
  logo_url text,
  updated_at timestamptz not null default now(),
  constraint organization_settings_singleton check (id)
);

alter table public.organization_settings enable row level security;
create policy authenticated_full_access on public.organization_settings for all to authenticated using (true) with check (true);
