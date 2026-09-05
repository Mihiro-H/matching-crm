-- 「商談・担当者管理」を「担当者一覧(people)」と「商談管理(deals)」に分割する。
-- 背景: 担当者(企業の窓口となる人)は既存顧客・見込み顧客を問わず横断的に一覧化したい一方、
-- 商談(問い合わせ〜受注/失注の案件化前パイプライン)はこれまで通り1件ずつの
-- ステータス管理が必要で、両者の性質が異なるため。
--
-- 「担当者交代」(is_current/started_at/ended_at)は、担当者が商談ステータスと
-- 切り離されて単純な横断ディレクトリになったことで不要になったため廃止する
-- (担当者は普通に編集・追加・削除するだけでよい)。

-- ---------------------------------------------------------------------------
-- 1. people(担当者一覧)を新設し、既存contactsの人物情報を1行1人としてそのまま
--    移行する(id を揃えておくことで、直後にcontactsをdealsへリネームした際に
--    person_id = 元のcontacts.id という対応関係をそのまま使える)。
-- ---------------------------------------------------------------------------
create table public.people (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  company_name_raw text,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.people (id, company_id, company_name_raw, name, email, phone, created_at, updated_at)
select id, company_id, company_name_raw, name, email, phone, created_at, updated_at
from public.contacts;

create trigger set_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

alter table public.people enable row level security;
create policy authenticated_full_access on public.people for all to authenticated using (true) with check (true);

-- 旧ビューを先に消す。company_list_view は companies.status と contacts(後述の
-- deals)の列に、contact_list_view は contacts(後述のdeals)の列に依存しており、
-- 依存されたままではこの後の列削除(company_id等)・companies.statusの削除が
-- 「cannot drop column ... because other objects depend on it」で失敗するため。
-- (新しいビューはこのマイグレーションの最後で作り直す)
drop view public.company_list_view;
drop view public.contact_list_view;

-- ---------------------------------------------------------------------------
-- 2. contacts を deals にリネームし、人物系カラムを person_id 参照に置き換える。
--    テーブル名を変更してもCHECK制約名(contacts_status_check等)は自動では
--    変わらないため、既存の制約名のまま操作する。
-- ---------------------------------------------------------------------------
alter table public.contacts rename to deals;

alter table public.deals add column person_id uuid references public.people (id) on delete restrict;
update public.deals set person_id = id;
alter table public.deals alter column person_id set not null;

alter table public.deals
  drop column company_id,
  drop column company_name_raw,
  drop column name,
  drop column email,
  drop column phone,
  drop column is_current,
  drop column started_at,
  drop column ended_at;

-- ステータスに「保留」を追加(SCREEN_SPEC.md「商談管理」)。
alter table public.deals drop constraint contacts_status_check;
alter table public.deals add constraint deals_status_check
  check (status in ('new', 'in_progress', 'negotiating', 'on_hold', 'won', 'lost'));

-- 受注理由・受注日時(失注理由・失注日時に相当する情報がなかったため対で追加)。
-- 「商談更新日」はupdated_atをそのまま使うため、won_atは受注確定タイミングの
-- 記録専用(集計・並び替えでupdated_atの汎用的な更新と混同しないための専用カラム)。
alter table public.deals add column won_reason text;
alter table public.deals add column won_at timestamptz;

-- どのフォーム経由の問い合わせかを覚えておく(商談詳細の「フォームの回答内容」表示で、
-- custom_fieldsの各キーをそのフォームのform_fields.labelで表示するために必要)。
-- 手動作成の商談(フォーム経由でない)はnullのままでよい。
alter table public.deals add column form_id uuid references public.form_definitions (id) on delete set null;

alter table public.deals rename constraint contacts_pkey to deals_pkey;
alter table public.deals rename constraint contacts_assigned_user_id_fkey to deals_assigned_user_id_fkey;

-- ---------------------------------------------------------------------------
-- 3. companies.status を廃止する。
-- ---------------------------------------------------------------------------
alter table public.companies drop constraint companies_status_check;
alter table public.companies drop column status;

-- ---------------------------------------------------------------------------
-- 4. projects.status: 「商談中」「見積提出済」を廃止し、代わりに「受注」を追加する
--    (それらの段階は商談側で扱うため。案件は受注した時点で初めて作られる)。
--    既存にnegotiating/estimate_submittedの行があれば、データ消失より安全側に
--    倒してwonへ寄せる。
--    旧制約はwonを許可していないため、先に制約を外してからUPDATEし、
--    データを是正し終えた後で新しい制約を追加する(逆順だとUPDATE自体が
--    旧制約に弾かれる)。
-- ---------------------------------------------------------------------------
alter table public.projects drop constraint projects_status_check;

update public.projects set status = 'won' where status in ('negotiating', 'estimate_submitted');

alter table public.projects add constraint projects_status_check
  check (status in (
    'won', 'contract_sent', 'contracted',
    'in_progress', 'inspected', 'payment_pending', 'completed'
  ));

-- projects.contact_id は元々「案件の窓口担当者」を指す想定だったため、
-- 分割後は人物そのものであるpeopleを参照させる。
alter table public.projects drop constraint projects_contact_id_fkey;
alter table public.projects add constraint projects_contact_id_fkey
  foreign key (contact_id) references public.people (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 5. meeting_notes.contact_id は実装上一度も書き込まれておらず(常にnull)、
--    企業名解決の予備経路としてのみ参照されていたが、商談詳細の「関連議事録」
--    タブはcompany_id経由の紐づけに統一するため、このカラム自体を廃止する。
-- ---------------------------------------------------------------------------
alter table public.meeting_notes drop constraint meeting_notes_contact_id_fkey;
alter table public.meeting_notes drop column contact_id;

-- integration_logs.related_entity_type の 'contact' を 'deal' に置き換える
-- (新規問い合わせ受付ログのタグ名を実体に合わせる。過去ログの値は 'contact' の
-- ままだが、単なる監査ログのため混在しても実害はない)。
alter table public.integration_logs drop constraint integration_logs_related_entity_type_check;
alter table public.integration_logs add constraint integration_logs_related_entity_type_check
  check (related_entity_type in ('deal', 'project', 'estimate', 'invoice', 'meeting_note', 'contact'));

-- ---------------------------------------------------------------------------
-- 6. 一覧用ビューの再構築(冒頭で削除した旧company_list_view/contact_list_viewの
--    作り直し)。company_list_view: ステータス列・担当者列を廃止。
--    contact_list_view: deals_list_view として作り直す(person_id経由でpeopleを結合)。
-- ---------------------------------------------------------------------------
create view public.company_list_view
with (security_invoker = true)
as
select
  c.id,
  c.name,
  c.industry,
  c.created_at,
  c.updated_at,
  latest_project.title as latest_project_title
from public.companies c
left join lateral (
  select p.title
  from public.projects p
  where p.company_id = c.id
  order by p.created_at desc
  limit 1
) latest_project on true;

create view public.deals_list_view
with (security_invoker = true)
as
select
  d.id,
  p.id as person_id,
  p.name,
  coalesce(c.name, p.company_name_raw) as company_name,
  d.source,
  d.job_categories,
  d.status,
  d.assigned_user_id,
  u.name as assignee_name,
  d.created_at,
  d.updated_at
from public.deals d
join public.people p on p.id = d.person_id
left join public.companies c on c.id = p.company_id
left join public.users u on u.id = d.assigned_user_id;
