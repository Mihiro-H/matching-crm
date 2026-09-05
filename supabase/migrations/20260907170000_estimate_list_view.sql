-- 見積・発注一覧(SCREEN_SPEC.md 5章)を企業一覧/案件管理/商談・担当者管理と同じ
-- 列見出しでの並び替え・絞り込みに対応させるため、estimatesに直接カラムを持たない
-- 「企業名」「案件名」を展開した一覧専用ビューを追加する。
-- company_list_view/contact_list_viewと同じ方針(security_invoker = true)。
create view public.estimate_list_view
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
  c.name as company_name
from public.estimates e
join public.projects p on p.id = e.project_id
join public.companies c on c.id = p.company_id;
