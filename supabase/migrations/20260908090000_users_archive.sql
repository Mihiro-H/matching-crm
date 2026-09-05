-- ユーザーのアーカイブ機能(退職等で担当を外れたが、過去の案件・問い合わせ等の
-- 履歴(assigned_user_id等)は残す必要があるユーザー向け)。
-- 物理削除ではなくフラグで論理的に無効化し、以後は担当者アサインの候補に出さない
-- (searchAssignableUsers参照)。既存の外部キー参照には一切影響しない。
alter table public.users
  add column is_archived boolean not null default false;
