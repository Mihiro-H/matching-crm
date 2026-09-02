-- 企業一覧(SCREEN_SPEC.md 3章)の列「直近の案件」「担当者」は
-- companiesに直接カラムを持たず、projects/contactsとの結合が必要なため、
-- 一覧表示専用のビューとして用意する。
--
-- - 直近の案件: その企業のprojectsのうちcreated_atが最も新しいもの
-- - 担当者: is_current=trueの窓口担当者(contacts)に紐づくassigned_user_id
--
-- security_invoker = true を明示し、ビュー越しでも呼び出し元のRLSポリシーが
-- そのまま適用されるようにする(PostgreSQL 15+のデフォルトはfalseなので注意)。
create view public.company_list_view
with (security_invoker = true)
as
select
  c.id,
  c.name,
  c.industry,
  c.status,
  c.created_at,
  c.updated_at,
  latest_project.title as latest_project_title,
  assignee.id as assignee_id,
  assignee.name as assignee_name
from public.companies c
left join lateral (
  select p.title
  from public.projects p
  where p.company_id = c.id
  order by p.created_at desc
  limit 1
) latest_project on true
left join lateral (
  select ct.assigned_user_id
  from public.contacts ct
  where ct.company_id = c.id and ct.is_current = true
  order by ct.started_at desc nulls last
  limit 1
) current_contact on true
left join public.users assignee on assignee.id = current_contact.assigned_user_id;
