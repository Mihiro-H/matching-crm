-- 問い合わせフォーム設定(SCREEN_SPEC.md「設定 > フォーム管理」)。
-- 実際の公開フォームは別ドメインで運用予定のため、ここではフォームの構成(項目・並び順・
-- 選択肢等)だけを管理し、公開フォーム側は /api/forms/[id]/schema (service role経由、
-- RLSを介さない) から構成を取得して描画する想定。
create table public.form_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.form_answer_type as enum ('text', 'textarea', 'single_select', 'multi_select');

-- field_key: contactsの実カラムに対応する項目は is_builtin=true とし、
-- name/email/phone/company_name/job_categories/inquiry_body のいずれかを入れる
-- (contacts側の対応関係はアプリ側の定数で管理し、DB側では文字列として持つのみ)。
-- is_builtin=false の場合は「新規追加した項目」であり、回答は contacts.custom_fields
-- (jsonb)にfield_keyをキーとして保存する(本物のカラムを都度ALTER TABLEするのは
-- 実行時のスキーマ変更に伴うリスクが大きいため避ける、一般的なカスタムフィールド実装方式)。
create table public.form_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.form_definitions(id) on delete cascade,
  field_key text not null,
  is_builtin boolean not null default false,
  label text not null,
  answer_type public.form_answer_type not null,
  options jsonb,
  is_required boolean not null default false,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (form_id, field_key)
);

create index idx_form_fields_form_id on public.form_fields (form_id, sort_order);

-- 新規追加項目の回答を保持する場所(built-in項目はcontactsの実カラムを使う)。
alter table public.contacts add column custom_fields jsonb not null default '{}'::jsonb;

alter table public.form_definitions enable row level security;
create policy authenticated_full_access on public.form_definitions for all to authenticated using (true) with check (true);

alter table public.form_fields enable row level security;
create policy authenticated_full_access on public.form_fields for all to authenticated using (true) with check (true);
