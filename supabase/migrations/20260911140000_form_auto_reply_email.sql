-- フォームの自動返信メール機能。
-- 1. フォームごとに件名・本文を設定できるようにする(プレースホルダーは{{name}}/
--    {{company_name}}/{{form_name}}、notification_settings.message_templateと同じ
--    {{...}}方式、slack/template.ts参照)。既存フォームに意図せずメールが飛ばないよう、
--    デフォルトは無効(auto_reply_enabled = false)にする。
alter table public.form_definitions add column auto_reply_enabled boolean not null default false;
alter table public.form_definitions add column auto_reply_subject text;
alter table public.form_definitions add column auto_reply_body text;

-- 2. 送信ログ(integration_logs)にメール送信を記録できるよう 'email' を追加する。
alter table public.integration_logs drop constraint integration_logs_integration_type_check;
alter table public.integration_logs add constraint integration_logs_integration_type_check
  check (integration_type in ('form', 'cloudsign', 'freee', 'slack', 'zoom', 'misoca', 'email'));
