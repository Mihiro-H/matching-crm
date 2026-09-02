-- 案件管理一覧(SCREEN_SPEC.md 4章)の列「企業名」「主担当」、
-- カンバンカードの「職種枠の概要」はcompanies/project_assignees/project_rolesとの
-- 結合・集計が必要なため、一覧表示専用のビューを用意する。
--
-- - 主担当: project_assigneesのうちrole='primary'の1件(ユニーク制約上、最大1件のはず)
-- - role_summary: 職種枠(job_category, headcount)の配列(jsonb)。
--   表示ラベル(「ライター」等)は日本語文言をSQLとTypeScript側で二重管理しないよう
--   ここでは生データのみ返し、フォーマットはJOB_CATEGORY_LABELS(src/lib/job-categories.ts)で行う。
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
  p.deadline,
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
