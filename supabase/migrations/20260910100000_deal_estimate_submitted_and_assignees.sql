-- 商談管理の拡張(1: サブ担当、2: 「見積提出済」フェーズ、3: 見積提出の停滞検知)。

-- ---------------------------------------------------------------------------
-- 1. 商談のサブ担当(deal_assignees)。
--    主担当は既存のdeals.assigned_user_idのまま変更せず、サブ担当だけをこのテーブルで
--    管理する(project_assigneesと違い、主担当/サブ担当の入れ替えは発生しないため
--    role列は持たない)。議事録の閲覧範囲(主担当+サブ担当)にも使う。
-- ---------------------------------------------------------------------------
create table public.deal_assignees (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (deal_id, user_id)
);

alter table public.deal_assignees enable row level security;
create policy authenticated_full_access on public.deal_assignees for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 2. 商談ステータスに「見積提出済」を追加する。
--    受注(won)確定後、見積書(estimates.document_type='estimate')が作成された時点で
--    自動的にこのステータスへ遷移する(手動では選べない。deals/actions.tsのgetNextStatusOptions
--    が返す遷移先には含まれない)。
--    estimate_submitted_at: 見積提出済に遷移した日時(=見積作成日)。再提出のたびに更新し、
--    30日経過判定の起点として使う。
--    stale_estimate_notified_at: 30日経過通知を送信済みかどうかのフラグ。見積が再提出される
--    たびにnullへ戻す(その見積についてはまた30日後に再判定できるようにするため)。
-- ---------------------------------------------------------------------------
alter table public.deals drop constraint deals_status_check;
alter table public.deals add constraint deals_status_check
  check (status in ('new', 'in_progress', 'negotiating', 'on_hold', 'won', 'estimate_submitted', 'lost'));

alter table public.deals add column estimate_submitted_at timestamptz;
alter table public.deals add column stale_estimate_notified_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. projects.deal_id: 案件がどの商談から受注確定して作られたかを覚えておく
--    (見積提出時に元の商談ステータスを自動更新するために必要。手動作成の案件は
--    対応する商談が無いためnullのまま)。
-- ---------------------------------------------------------------------------
alter table public.projects add column deal_id uuid references public.deals (id) on delete set null;
create index projects_deal_id_idx on public.projects (deal_id);
