-- 商談・担当者管理一覧(SCREEN_SPEC.md 2章)をテーブル表示+ソート可能にするため、
-- companies/usersとの結合が必要な列(企業名・主担当名)を展開した一覧専用ビューを追加する。
-- company_list_view/project_list_viewと同じ方針(security_invoker = true)。
create view public.contact_list_view
with (security_invoker = true)
as
select
  ct.id,
  ct.company_id,
  coalesce(c.name, ct.company_name_raw) as company_name,
  ct.name,
  ct.email,
  ct.phone,
  ct.source,
  ct.job_categories,
  ct.status,
  ct.assigned_user_id,
  u.name as assignee_name,
  ct.created_at,
  ct.updated_at
from public.contacts ct
left join public.companies c on c.id = ct.company_id
left join public.users u on u.id = ct.assigned_user_id;
