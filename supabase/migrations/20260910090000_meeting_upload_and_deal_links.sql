-- 1. 商談管理・案件管理の一覧で企業名にリンクを張れるよう、deals_list_view に
--    company_id を追加する。CREATE OR REPLACE VIEW は既存の列の末尾に追加する
--    形でしか列を増やせない(途中への挿入や既存列の変更・削除は不可)ため、
--    company_id は末尾に追加する。
create or replace view public.deals_list_view
with (security_invoker = true)
as
select
  d.id,
  p.id as person_id,
  p.name,
  coalesce(c.name, p.company_name_raw) as company_name,
  d.source,
  d.job_categories,
  d.status,
  d.assigned_user_id,
  u.name as assignee_name,
  d.created_at,
  d.updated_at,
  p.company_id
from public.deals d
join public.people p on p.id = d.person_id
left join public.companies c on c.id = p.company_id
left join public.users u on u.id = d.assigned_user_id;

-- ---------------------------------------------------------------------------
-- 2. 議事録自動取り込み(Google Drive + AssemblyAI)を廃止し、CRM内での
--    直接アップロード(音声/動画ファイル+関連する商談または案件を選択)に置き換える。
--    文字起こし・要約自体(AssemblyAI呼び出し)のロジックは変更しない。
-- ---------------------------------------------------------------------------

-- Drive自動取り込み時の「企業までは自動特定できたが案件は未定」という中間状態が
-- 前提だったcompany_idは、アップロード時に商談/案件を確定選択する新フローでは
-- 不要になるため廃止する。代わりに、案件が確定する前の商談(deals)へも
-- 直接紐づけられるよう deal_id を新設する。
alter table public.meeting_notes drop constraint meeting_notes_company_id_fkey;
alter table public.meeting_notes drop column company_id;
alter table public.meeting_notes add column deal_id uuid references public.deals (id) on delete set null;
create index idx_meeting_notes_deal_id on public.meeting_notes (deal_id);

drop table public.drive_meeting_imports;

-- CRM内アップロードの非同期処理状況を記録する(drive_meeting_importsと同じ
-- submitted/completed/failedの3状態設計を踏襲。詳しくはlib/meeting-notes/upload-actions.ts参照)。
-- 案件・商談のどちらか一方に必ず紐づける(num_nonnulls: どちらか片方だけがnot nullであることを検証)。
create table public.meeting_note_uploads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_at timestamptz not null,
  project_id uuid references public.projects (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  assemblyai_transcript_id text,
  status text not null check (status in ('submitted', 'completed', 'failed')) default 'submitted',
  meeting_note_id uuid references public.meeting_notes (id) on delete set null,
  error_message text,
  created_by uuid not null references public.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_note_uploads_exactly_one_link check (num_nonnulls(project_id, deal_id) = 1)
);

create index idx_meeting_note_uploads_status on public.meeting_note_uploads (status);

create trigger set_updated_at
  before update on public.meeting_note_uploads
  for each row execute function public.set_updated_at();

alter table public.meeting_note_uploads enable row level security;
create policy authenticated_full_access on public.meeting_note_uploads
  for all to authenticated using (true) with check (true);
