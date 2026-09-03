-- アプリ内通知(ヘッダーのベルアイコン)。
-- notification_settingsはSlack通知先の設定のみでユーザー個別の通知は保持していないため、
-- 新たにユーザー単位の通知テーブルを用意する。

-- 「新規問い合わせ」通知の宛先(案件振り分け担当者)。まだ担当者が決まっていない
-- 問い合わせイベントのため、project_assigneesのような案件起点の紐付けが使えず、
-- 事前に指名されたユーザーへ通知する(設定画面のユーザー管理で切り替える)。
alter table public.users
  add column is_lead_distributor boolean not null default false;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  event_type text not null check (event_type in ('new_lead', 'contract_signed', 'payment_confirmed', 'reminder')),
  title text not null,
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id_created_at on public.notifications (user_id, created_at desc);
create index idx_notifications_user_id_unread on public.notifications (user_id) where read_at is null;

-- notificationsは他の大半のテーブル(社内全員が閲覧できる業務データ)と違い、
-- 本人だけが見られるべき個人データのため、20260902024752_initial_schema.sqlの
-- 「authenticated全許可」パターンではなく行単位(auth.uid())で絞る。
-- 書き込みはnotify.tsのservice-role adminクライアント経由のみが行うため、
-- authenticatedロールへのINSERT/DELETE許可は与えない(既読更新のみUPDATEを許可)。
alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
