-- 商談・案件のURLが長すぎる(UUID)問題への対応。
-- 内部の主キー(id, uuid)はそのまま残し、URL・画面表示専用の短い連番(number)を追加する。
-- 既存行にも自動採番される(generated always as identityは既存行にも順に値を振る)。
-- 外部キー参照は引き続きuuidのidを使う(この列はURL解決専用で、リレーションには使わない)。

alter table public.deals add column number bigint generated always as identity;
alter table public.deals add constraint deals_number_unique unique (number);

alter table public.projects add column number bigint generated always as identity;
alter table public.projects add constraint projects_number_unique unique (number);

-- deals_list_view/project_list_viewにもnumberを公開する(一覧・リンク生成で使うため)。
-- CREATE OR REPLACE VIEWは列の末尾追加のみ可能なため、numberは末尾に置く。
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
  p.company_id,
  d.number
from public.deals d
join public.people p on p.id = d.person_id
left join public.companies c on c.id = p.company_id
left join public.users u on u.id = d.assigned_user_id;

create or replace view public.project_list_view
with (security_invoker = true)
as
select
  p.id,
  p.company_id,
  c.name as company_name,
  p.title,
  p.status,
  p.budget,
  p.start_date,
  p.end_date,
  p.created_at,
  p.updated_at,
  primary_assignee.user_id as assignee_id,
  u.name as assignee_name,
  coalesce(role_summary.roles, '[]'::jsonb) as role_summary,
  p.number
from public.projects p
join public.companies c on c.id = p.company_id
left join lateral (
  select pa.user_id
  from public.project_assignees pa
  where pa.project_id = p.id and pa.role = 'primary'
  limit 1
) primary_assignee on true
left join public.users u on u.id = primary_assignee.user_id
left join lateral (
  select jsonb_agg(
    jsonb_build_object('job_category', pr.job_category, 'headcount', pr.headcount)
    order by pr.created_at
  ) as roles
  from public.project_roles pr
  where pr.project_id = p.id
) role_summary on true;

create or replace view public.estimate_list_view
with (security_invoker = true)
as
select
  e.id,
  e.document_type,
  e.amount,
  e.contract_status,
  e.created_at,
  p.id as project_id,
  p.title as project_title,
  c.id as company_id,
  c.name as company_name,
  p.number as project_number
from public.estimates e
join public.projects p on p.id = e.project_id
join public.companies c on c.id = p.company_id;
