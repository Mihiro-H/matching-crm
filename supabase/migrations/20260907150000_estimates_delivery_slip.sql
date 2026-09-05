-- 「発注書」はMisoca上で独立した書類種別としてAPI作成できず(見積書からの派生としてのみ
-- 存在)、実務上の利用頻度も低いため廃止する。代わりに「納品書」(Misoca側もPOST
-- /delivery_slipという別エンドポイントの独立した書類種別)を選べるようにする。
--
-- 既存にdocument_type='order'の行があれば、制約を差し替える前に'estimate'へ寄せておく
-- (真に発注書だった行の扱いは要検討だが、データ消失より安全側に倒す)。
update public.estimates set document_type = 'estimate' where document_type = 'order';

alter table public.estimates
  drop constraint estimates_document_type_check;
alter table public.estimates
  add constraint estimates_document_type_check
  check (document_type in ('estimate', 'delivery_slip'));

-- 見積書だけでなく納品書のMisoca書類IDも保持するため、より汎用的な名前に変更する
-- (document_typeで見積書API/納品書APIのどちらを呼ぶか判定する)。
alter table public.estimates
  rename column misoca_estimate_id to misoca_document_id;
