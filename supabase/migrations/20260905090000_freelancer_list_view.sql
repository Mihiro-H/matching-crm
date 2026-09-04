-- フリーランス一覧の新列「進行中案件数」(status='in_progress'の案件にアサインされている
-- 件数)は project_role_assignments -> project_roles -> projects の結合・集計が必要なため、
-- company_list_view/project_list_view/contact_list_viewと同じ方針で一覧専用ビューを追加する。
create view public.freelancer_list_view
with (security_invoker = true)
as
select
  f.id,
  f.platform_freelancer_id,
  f.name,
  f.email,
  f.job_categories,
  f.last_imported_at,
  f.created_at,
  f.updated_at,
  coalesce(active_count.count, 0) as active_project_count
from public.freelancers f
left join lateral (
  select count(distinct p.id) as count
  from public.project_role_assignments pra
  join public.project_roles pr on pr.id = pra.project_role_id
  join public.projects p on p.id = pr.project_id
  where pra.freelancer_id = f.id and p.status = 'in_progress'
) active_count on true;
