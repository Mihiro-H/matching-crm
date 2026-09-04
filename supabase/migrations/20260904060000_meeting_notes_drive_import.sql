-- 議事録の自動取り込み(Google Drive + AssemblyAI)。
-- Zoomの無料プランはクラウド録画非対応(=文字起こしイベントが発生しない)ため、
-- 「Google Driveの企業名フォルダに置かれた音声をAssemblyAIで文字起こし・要約する」
-- 方式に変更した。企業フォルダ名から企業は自動特定できるが、案件は自動では
-- 分からないため、meeting_notes.company_idを新設し、project_idは後から手動で
-- 紐付ける運用とする(project_idは元々nullable)。

alter table public.meeting_notes
  add column company_id uuid references public.companies (id) on delete set null;

create index idx_meeting_notes_company_id on public.meeting_notes (company_id);

-- Driveの音声ファイルごとの取り込み状況を記録する(同じファイルを二重処理しない
-- ためのdedup台帳を兼ねる)。AssemblyAIの文字起こしは非同期(数十秒〜数分)なので、
-- 1回のcron実行内では完結させず、
--   1. submitted: Driveから新規ファイルを見つけ、AssemblyAIに送信した直後
--   2. completed: 後続のcron実行でAssemblyAI側の完了を確認し、meeting_notesを作成できた
--   3. failed: いずれかの段階でエラー
-- の3状態で進める(サーバーレス関数のタイムアウトを避けるための2フェーズ設計)。
create table public.drive_meeting_imports (
  id uuid primary key default gen_random_uuid(),
  drive_file_id text not null unique,
  drive_file_name text not null,
  drive_file_web_view_link text,
  matched_company_id uuid references public.companies (id) on delete set null,
  assemblyai_transcript_id text,
  status text not null check (status in ('submitted', 'completed', 'failed')),
  meeting_note_id uuid references public.meeting_notes (id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_drive_meeting_imports_status on public.drive_meeting_imports (status);

create trigger set_updated_at
  before update on public.drive_meeting_imports
  for each row execute function public.set_updated_at();

-- この2テーブルは(notificationsと違い)社内向けの共有業務データなので、
-- 既存テーブル群と同じ「authenticated全許可、アプリ層で権限制御」の方針にそろえる。
alter table public.drive_meeting_imports enable row level security;
create policy authenticated_full_access on public.drive_meeting_imports
  for all to authenticated using (true) with check (true);
