-- 依頼職種に「その他」を追加する(ライター/フォトグラファー/マーケター/デザイナーの4種固定から5種に拡張)。
-- job_categoryはdeals(商談の依頼職種)・project_roles(案件の募集職種)・freelancers(対応職種)の
-- 3テーブルで共有している概念のため、すべてのcheck制約を合わせて更新する。

alter table public.deals drop constraint contacts_job_categories_check;
alter table public.deals add constraint contacts_job_categories_check
  check (job_categories <@ array['writer', 'photographer', 'marketer', 'designer', 'other']::text[]);

alter table public.project_roles drop constraint project_roles_job_category_check;
alter table public.project_roles add constraint project_roles_job_category_check
  check (job_category in ('writer', 'photographer', 'marketer', 'designer', 'other'));

alter table public.freelancers drop constraint freelancers_job_categories_check;
alter table public.freelancers add constraint freelancers_job_categories_check
  check (job_categories is null or job_categories <@ array['writer', 'photographer', 'marketer', 'designer', 'other']::text[]);

-- 既存フォームの「依頼職種」項目の選択肢にも「その他」を追加する
-- (20260911110000で正しい4値へリセット済みの行に対して、5値の完全なリストへ上書きする)。
update public.form_fields
set options = '[
  {"value": "writer", "label": "ライター"},
  {"value": "photographer", "label": "フォトグラファー"},
  {"value": "marketer", "label": "マーケター"},
  {"value": "designer", "label": "デザイナー"},
  {"value": "other", "label": "その他"}
]'::jsonb
where is_builtin = true and field_key = 'job_categories';
