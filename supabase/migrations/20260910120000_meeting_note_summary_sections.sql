-- 議事録のAI要約を「要点/決議事項/ネクストアクション」の3分類(箇条書き)に構造化し、
-- 文字起こし全文をトグルで折りたたんで表示できるようにする。
--
-- ai_summary(text)は既存の一覧カードの抜粋表示等でそのまま使い続けるため残す
-- (このカラムには3分類を単純に連結した平文を入れる。要約に失敗した場合は
-- 文字起こし全文の冒頭を代わりに入れる)。
-- ai_summary_sections(jsonb)に構造化データ本体を持たせ、詳細画面はこちらを優先して使う
-- (無い場合はai_summaryを平文のままフォールバック表示する。古いDrive取り込み時代の
-- 議事録がこれに該当する)。
-- transcript_text(text)は文字起こし全文そのもの。旧Driveフローのtranscript_url
-- (Googleドキュメントへのリンク)とは別物として残す。

alter table public.meeting_notes add column ai_summary_sections jsonb;
alter table public.meeting_notes add column transcript_text text;
