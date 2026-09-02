-- クラウドサイン送付先(署名者)メールアドレスを企業単位で記憶しておくための列。
-- 見積・発注送付フォーム(SCREEN_SPEC.md 5章)で毎回入力せずに済むよう、
-- 送付時に入力された値をここに保存し、次回以降のデフォルト値として使う。
alter table public.companies
  add column esignature_email text;
