-- Orbit: initial schema
-- Source: DB_SCHEMA.md
--
-- Design notes / assumptions made where DB_SCHEMA.md did not specify a value
-- (flagged here so they can be revisited):
--   * Status/category columns are implemented as `text` + CHECK constraints
--     (not native Postgres ENUM types), matching how DB_SCHEMA.md documents
--     them and keeping it cheap to add new values later.
--   * ON DELETE behavior is not specified in DB_SCHEMA.md. Chosen defaults:
--       - RESTRICT on FKs to primary business records (companies, projects,
--         users as a created_by/imported_by audit trail) to avoid silent
--         data loss.
--       - CASCADE on FKs that only exist to describe their parent (project
--         line items / join tables: project_assignees, project_roles,
--         project_role_assignments, department_page_permissions,
--         report_schedules, report_runs).
--       - SET NULL on FKs that DB_SCHEMA.md already marks nullable.
--   * The `public.users` <-> `auth.users` sync trigger described in
--     TECH_STACK.md is intentionally NOT included in this migration.
--     TECH_STACK.md says a trigger creates `public.users` on signup, but
--     SCREEN_SPEC.md's login screen requires rejecting login when no
--     `public.users` row exists yet (admin must create the account first).
--     Those two behaviors conflict as written, so the actual auth
--     provisioning logic is deferred to the login/auth implementation phase
--     pending clarification, rather than guessed at here.
--   * RLS: every table gets RLS enabled with a single baseline policy
--     (authenticated users only, full access). Page-by-page / role-based
--     permission enforcement (`user_page_permissions`,
--     `department_page_permissions`) stays in the application layer per
--     product decision; this baseline only blocks anonymous access via the
--     Supabase anon key / PostgREST.

create extension if not exists pgcrypto;

-- Shared trigger to keep `updated_at` current on UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- departments
-- =========================================================================
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- users (mirrors auth.users; id is the same UUID Supabase Auth issues)
-- =========================================================================
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('sales', 'accounting', 'admin')),
  department_id uuid references public.departments (id) on delete set null,
  slack_user_id text,
  created_at timestamptz not null default now()
);

create index idx_users_department_id on public.users (department_id);

-- =========================================================================
-- department_page_permissions
-- =========================================================================
create table public.department_page_permissions (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  page_key text not null,
  permission text not null check (permission in ('edit', 'view', 'hidden')),
  updated_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (department_id, page_key)
);

create trigger set_updated_at
  before update on public.department_page_permissions
  for each row execute function public.set_updated_at();

-- =========================================================================
-- companies
-- =========================================================================
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  status text not null check (status in ('negotiating', 'active', 'paused', 'cold')),
  first_contact_date date,
  platform_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_companies_status on public.companies (status);

create trigger set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- =========================================================================
-- contacts (inquiries -> current point-of-contact lifecycle)
-- =========================================================================
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  company_name_raw text,
  name text not null,
  email text,
  phone text,
  source text not null check (source in ('form', 'referral', 'other')),
  job_categories text[] not null default '{}'
    check (job_categories <@ array['writer', 'photographer', 'marketer', 'designer']::text[]),
  inquiry_body text,
  status text not null check (status in ('new', 'in_progress', 'negotiating', 'won', 'lost')),
  lost_reason text,
  is_current boolean not null default false,
  assigned_user_id uuid references public.users (id) on delete set null,
  started_at date,
  ended_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contacts_company_id on public.contacts (company_id);
create index idx_contacts_status on public.contacts (status);
create index idx_contacts_assigned_user_id on public.contacts (assigned_user_id);
create index idx_contacts_is_current on public.contacts (is_current);

create trigger set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- =========================================================================
-- projects
-- =========================================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  contact_id uuid references public.contacts (id) on delete set null,
  title text not null,
  budget numeric,
  deadline date,
  status text not null check (status in (
    'negotiating', 'estimate_submitted', 'contract_sent', 'contracted',
    'in_progress', 'inspected', 'payment_pending', 'completed'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_projects_company_id on public.projects (company_id);
create index idx_projects_contact_id on public.projects (contact_id);
create index idx_projects_status on public.projects (status);

create trigger set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- =========================================================================
-- project_assignees
-- =========================================================================
create table public.project_assignees (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null check (role in ('primary', 'secondary')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index idx_project_assignees_project_id on public.project_assignees (project_id);
create index idx_project_assignees_user_id on public.project_assignees (user_id);

-- =========================================================================
-- project_roles
-- =========================================================================
create table public.project_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  job_category text not null check (job_category in ('writer', 'photographer', 'marketer', 'designer')),
  headcount integer not null check (headcount > 0),
  created_at timestamptz not null default now()
);

create index idx_project_roles_project_id on public.project_roles (project_id);

-- =========================================================================
-- freelancers (local cache of the platform's freelancer master; read-only
-- in the app except via CSV import upsert)
-- =========================================================================
create table public.freelancers (
  id uuid primary key default gen_random_uuid(),
  platform_freelancer_id text not null unique,
  name text not null,
  email text,
  job_categories text[]
    check (job_categories is null or job_categories <@ array['writer', 'photographer', 'marketer', 'designer']::text[]),
  last_imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.freelancers
  for each row execute function public.set_updated_at();

-- =========================================================================
-- project_role_assignments
-- =========================================================================
create table public.project_role_assignments (
  id uuid primary key default gen_random_uuid(),
  project_role_id uuid not null references public.project_roles (id) on delete cascade,
  freelancer_id uuid not null references public.freelancers (id) on delete restrict,
  assigned_at date not null,
  created_at timestamptz not null default now()
);

create index idx_project_role_assignments_project_role_id on public.project_role_assignments (project_role_id);
create index idx_project_role_assignments_freelancer_id on public.project_role_assignments (freelancer_id);

-- =========================================================================
-- csv_imports
-- =========================================================================
create table public.csv_imports (
  id uuid primary key default gen_random_uuid(),
  target_table text not null check (target_table in ('freelancers')),
  file_name text not null,
  imported_by uuid not null references public.users (id) on delete restrict,
  row_count integer not null,
  success_count integer not null,
  error_count integer not null,
  error_log jsonb,
  created_at timestamptz not null default now()
);

create index idx_csv_imports_imported_by on public.csv_imports (imported_by);

-- =========================================================================
-- estimates
-- =========================================================================
create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete restrict,
  document_type text not null check (document_type in ('estimate', 'order')),
  amount numeric not null,
  pdf_url text,
  cloudsign_document_id text,
  contract_status text not null check (contract_status in ('draft', 'sent', 'signed', 'rejected')),
  sent_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_estimates_project_id on public.estimates (project_id);

-- =========================================================================
-- meeting_notes
-- =========================================================================
create table public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  title text not null,
  meeting_at timestamptz not null,
  source text not null check (source in ('zoom', 'upload', 'manual')),
  transcript_url text,
  ai_summary text not null,
  action_items jsonb not null default '[]',
  created_by uuid not null references public.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index idx_meeting_notes_project_id on public.meeting_notes (project_id);
create index idx_meeting_notes_contact_id on public.meeting_notes (contact_id);

-- =========================================================================
-- invoices
-- =========================================================================
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete restrict,
  company_id uuid not null references public.companies (id) on delete restrict,
  freee_invoice_id text,
  amount numeric not null,
  issued_date date,
  due_date date,
  payment_status text not null check (payment_status in ('not_invoiced', 'invoiced', 'unpaid', 'paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_invoices_project_id on public.invoices (project_id);
create index idx_invoices_company_id on public.invoices (company_id);
create index idx_invoices_payment_status on public.invoices (payment_status);

create trigger set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- =========================================================================
-- notification_settings
-- =========================================================================
create table public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('new_lead', 'contract_signed', 'payment_confirmed', 'reminder')),
  slack_channel_id text not null,
  message_template text not null,
  is_active boolean not null default true,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.notification_settings
  for each row execute function public.set_updated_at();

-- =========================================================================
-- reports
-- =========================================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  metrics jsonb not null
    check (jsonb_typeof(metrics) = 'array'),
  filters jsonb,
  created_by uuid not null references public.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reports_created_by on public.reports (created_by);

create trigger set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- =========================================================================
-- report_schedules
-- =========================================================================
create table public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  frequency text not null check (frequency in ('weekly', 'monthly')),
  day_of_week integer check (day_of_week between 0 and 6),
  day_of_month integer check (day_of_month between 1 and 31),
  time_of_day time not null,
  slack_channel_id text not null,
  message_template text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_schedules_day_matches_frequency check (
    (frequency = 'weekly' and day_of_week is not null and day_of_month is null)
    or (frequency = 'monthly' and day_of_month is not null and day_of_week is null)
  )
);

create index idx_report_schedules_report_id on public.report_schedules (report_id);

create trigger set_updated_at
  before update on public.report_schedules
  for each row execute function public.set_updated_at();

-- =========================================================================
-- report_runs
-- =========================================================================
create table public.report_runs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  schedule_id uuid references public.report_schedules (id) on delete set null,
  generated_at timestamptz not null default now(),
  result_snapshot jsonb not null,
  status text not null check (status in ('success', 'failed')),
  error_message text
);

create index idx_report_runs_report_id on public.report_runs (report_id);
create index idx_report_runs_schedule_id on public.report_runs (schedule_id);

-- =========================================================================
-- user_page_permissions
-- =========================================================================
create table public.user_page_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  page_key text not null,
  permission text not null check (permission in ('edit', 'view', 'hidden')),
  updated_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (user_id, page_key)
);

create index idx_user_page_permissions_user_id on public.user_page_permissions (user_id);

create trigger set_updated_at
  before update on public.user_page_permissions
  for each row execute function public.set_updated_at();

-- =========================================================================
-- integration_logs
-- =========================================================================
create table public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  integration_type text not null check (integration_type in ('form', 'cloudsign', 'freee', 'slack', 'zoom')),
  direction text not null check (direction in ('inbound', 'outbound')),
  related_entity_type text check (related_entity_type in ('contact', 'project', 'estimate', 'invoice')),
  related_entity_id uuid,
  payload jsonb not null,
  status text not null check (status in ('success', 'failed', 'retrying')),
  error_message text,
  occurred_at timestamptz not null default now()
);

create index idx_integration_logs_integration_type on public.integration_logs (integration_type);
create index idx_integration_logs_related_entity on public.integration_logs (related_entity_type, related_entity_id);

-- =========================================================================
-- Row Level Security: baseline "authenticated users only" policy.
-- Fine-grained page/role permission checks stay in the application layer
-- (see DB_SCHEMA.md / SCREEN_SPEC.md). This only blocks anonymous access
-- via the Supabase anon key / PostgREST.
-- =========================================================================
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'departments', 'users', 'department_page_permissions', 'companies',
      'contacts', 'projects', 'project_assignees', 'project_roles',
      'freelancers', 'project_role_assignments', 'csv_imports', 'estimates',
      'meeting_notes', 'invoices', 'notification_settings', 'reports',
      'report_schedules', 'report_runs', 'user_page_permissions',
      'integration_logs'
    ])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy authenticated_full_access on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end;
$$;
