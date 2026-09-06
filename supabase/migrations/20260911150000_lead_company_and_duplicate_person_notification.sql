-- 「担当者メールアドレス重複」の通知イベントを追加する。
-- フォームからの問い合わせで、既存の担当者(people)と同じメールアドレスの担当者が
-- 新規作成された場合に、統合するかどうかの判断を管理者に委ねるための通知
-- (アプリ内通知+Slack、submit-form.ts notifyIfDuplicatePersonEmail参照)。
-- なお企業(companies)の自動登録はDBスキーマの変更を伴わない(既存のcompany_id/
-- company_name_rawをそのまま使う)ため、こちらのマイグレーションは不要。

alter table public.notifications drop constraint notifications_event_type_check;
alter table public.notifications add constraint notifications_event_type_check
  check (event_type in (
    'new_lead', 'contract_signed', 'payment_confirmed', 'reminder',
    'meeting_note_ready', 'meeting_note_failed', 'duplicate_person_email'
  ));

alter table public.notification_settings drop constraint notification_settings_event_type_check;
alter table public.notification_settings add constraint notification_settings_event_type_check
  check (event_type in (
    'new_lead', 'contract_signed', 'payment_confirmed', 'reminder',
    'meeting_note_ready', 'meeting_note_failed', 'duplicate_person_email'
  ));
