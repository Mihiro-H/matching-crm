-- Misoca請求書作成連携(精算管理)。
-- companies.misoca_contact_group_id: Misoca側の取引先(POST /contact_group)を
-- 企業ごとに1回だけ作成し、以後使い回すためのキャッシュ。
-- invoices.misoca_invoice_id: Orbitで作成したMisoca請求書のID(入金状況ポーリングや
-- PDF取得の際にこのIDでMisoca APIを呼ぶ)。
alter table public.companies
  add column misoca_contact_group_id text;

alter table public.invoices
  add column misoca_invoice_id text;

-- integration_logsにmisocaからの入金状況ポーリング結果を記録できるようにする。
alter table public.integration_logs
  drop constraint integration_logs_integration_type_check;
alter table public.integration_logs
  add constraint integration_logs_integration_type_check
  check (integration_type in ('form', 'cloudsign', 'freee', 'slack', 'zoom', 'misoca'));
