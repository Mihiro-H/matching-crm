-- 見積書・発注書の実PDFをMisocaで発行できるようにする(SCREEN_SPEC.md 5章)。
alter table public.estimates
  add column misoca_estimate_id text;
