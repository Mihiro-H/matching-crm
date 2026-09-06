-- 「個人情報の取扱いについての同意」項目の不具合修正。
-- フォーム編集画面の「選択肢」欄でこの項目を保存すると、選択肢のvalueがラベル文字列で
-- 上書きされてしまい、公開フォームからの送信時に検証(parse-submission.ts)が
-- 「不正な値があります: agreed」エラーで失敗する不具合があった
-- (アプリ側はactions.ts updateFieldで修正済み。このマイグレーションは、
-- 修正前に既に保存されてしまった行を固定の正しい選択肢へ戻すデータ修正)。
update public.form_fields
set options = '[{"value": "agreed", "label": "✅個人情報の取扱いについて同意する"}]'::jsonb
where is_builtin = true and field_key = 'privacy_consent';
