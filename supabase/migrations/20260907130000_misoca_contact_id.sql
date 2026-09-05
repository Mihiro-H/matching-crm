-- Misoca APIの取引先(contact_group)と送り先(contact)は別エンティティで、
-- 請求書・見積書のcontact_idは「送り先」の方を指す(取引先IDでは
-- 「取引先IDに関連する取引先が存在しません」というバリデーションエラーになる)。
-- 取引先グループ(misoca_contact_group_id)配下に作った送り先IDも企業ごとに記憶しておく。
alter table public.companies
  add column misoca_contact_id text;
