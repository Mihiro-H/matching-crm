-- 「依頼職種」項目の不具合修正。
-- ビルトイン項目(job_categories)の「選択肢」欄を管理画面で編集すると、選択肢のvalueが
-- ラベル文字列(例: "デザイナー")で上書きされてしまい、deals.job_categories列のcheck制約
-- (writer/photographer/marketer/designerの4値のみ許可)に反して公開フォームからの送信が
-- 失敗する不具合があった(privacy_consentと同種の不具合。actions.ts updateFieldで修正済み)。
-- 既に保存されてしまった行を固定の正しい選択肢へ戻す。
update public.form_fields
set options = '[
  {"value": "writer", "label": "ライター"},
  {"value": "photographer", "label": "フォトグラファー"},
  {"value": "marketer", "label": "マーケター"},
  {"value": "designer", "label": "デザイナー"}
]'::jsonb
where is_builtin = true and field_key = 'job_categories';
