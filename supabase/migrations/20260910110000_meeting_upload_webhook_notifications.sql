-- 議事録アップロードの完了/失敗をAssemblyAI Webhook経由でも検知できるようにし、
-- アップロード実行者へアプリ内通知(meeting_note_ready/meeting_note_failed)を送れるようにする。
-- 背景: 従来はブラウザのポーリングのみに依存しており、アップロード画面を離れると
-- 完了/失敗のどちらであっても検知する手段が無かったため。

alter table public.notifications drop constraint notifications_event_type_check;
alter table public.notifications add constraint notifications_event_type_check
  check (event_type in (
    'new_lead', 'contract_signed', 'payment_confirmed', 'reminder',
    'meeting_note_ready', 'meeting_note_failed'
  ));

alter table public.notification_settings drop constraint notification_settings_event_type_check;
alter table public.notification_settings add constraint notification_settings_event_type_check
  check (event_type in (
    'new_lead', 'contract_signed', 'payment_confirmed', 'reminder',
    'meeting_note_ready', 'meeting_note_failed'
  ));
