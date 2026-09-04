-- 案件の「納期」(単一日付)を「開始日〜終了日」の期間に変更する。
-- project_list_viewはp.deadlineを直接参照しているため、列変更に合わせて作り直す
-- (CREATE OR REPLACE VIEWは列名の変更を許可しないため、DROP+CREATEで対応する)。
drop view public.project_list_view;

alter table public.projects rename column deadline to end_date;
alter table public.projects add column start_date date;

create view public.project_list_view
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
  coalesce(role_summary.roles, '[]'::jsonb) as role_summary
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
