// Orbit データベース型定義
// 出典: supabase/migrations/20260902024752_initial_schema.sql (DB_SCHEMA.md準拠)
// `supabase gen types typescript` で自動生成する運用に移行するまでの手書き版。
// 実プロジェクト接続後は `npx supabase gen types typescript --linked` で
// このファイルを置き換えること。

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "sales" | "accounting" | "admin";
export type PagePermission = "edit" | "view" | "hidden";
export type DealSource = "form" | "referral" | "other";
export type JobCategory = "writer" | "photographer" | "marketer" | "designer" | "other";
export type DealStatus =
  | "new"
  | "in_progress"
  | "negotiating"
  | "on_hold"
  | "won"
  | "estimate_submitted"
  | "lost";
export type ProjectStatus =
  | "won"
  | "contract_sent"
  | "contracted"
  | "in_progress"
  | "inspected"
  | "payment_pending"
  | "completed";
export type AssigneeRole = "primary" | "secondary";
export type EstimateDocumentType = "estimate" | "delivery_slip";
export type ContractStatus = "draft" | "sent" | "signed" | "rejected";
export type MeetingNoteSource = "zoom" | "upload" | "manual";
export type MeetingUploadStatus = "submitted" | "completed" | "failed";
export type PaymentStatus = "not_invoiced" | "invoiced" | "unpaid" | "paid";
export type NotificationEventType =
  | "new_lead"
  | "contract_signed"
  | "payment_confirmed"
  | "reminder"
  | "meeting_note_ready"
  | "meeting_note_failed"
  | "duplicate_person_email";
export type ReportFrequency = "weekly" | "monthly";
export type ReportRunStatus = "success" | "failed";
export type IntegrationType = "form" | "cloudsign" | "freee" | "slack" | "zoom" | "misoca" | "email";
export type IntegrationDirection = "inbound" | "outbound";
export type IntegrationRelatedEntityType = "deal" | "project" | "estimate" | "invoice" | "meeting_note";
export type IntegrationLogStatus = "success" | "failed" | "retrying";
export type FormAnswerType = "text" | "textarea" | "single_select" | "multi_select";

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["departments"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: UserRole;
          department_id: string | null;
          slack_user_id: string | null;
          is_lead_distributor: boolean;
          // supabase/migrations/20260908090000_users_archive.sql
          is_archived: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role: UserRole;
          department_id?: string | null;
          slack_user_id?: string | null;
          is_lead_distributor?: boolean;
          is_archived?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey";
            columns: ["department_id"];
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
        ];
      };
      department_page_permissions: {
        Row: {
          id: string;
          department_id: string;
          page_key: string;
          permission: PagePermission;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          page_key: string;
          permission: PagePermission;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["department_page_permissions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "department_page_permissions_department_id_fkey";
            columns: ["department_id"];
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "department_page_permissions_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          industry: string | null;
          first_contact_date: string | null;
          platform_account_id: string | null;
          esignature_email: string | null;
          misoca_contact_group_id: string | null;
          misoca_contact_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          industry?: string | null;
          first_contact_date?: string | null;
          platform_account_id?: string | null;
          esignature_email?: string | null;
          misoca_contact_group_id?: string | null;
          misoca_contact_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      // supabase/migrations/20260909090000_deals_people_split.sql
      people: {
        Row: {
          id: string;
          company_id: string | null;
          company_name_raw: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          company_name_raw?: string | null;
          name: string;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["people"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "people_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      // supabase/migrations/20260909090000_deals_people_split.sql (contactsからリネーム)
      deals: {
        Row: {
          id: string;
          // supabase/migrations/20260910130000_deal_project_short_numbers.sql
          // URL用の短い連番(generated always as identityのためInsertには含めない)。
          number: number;
          person_id: string;
          source: DealSource;
          job_categories: JobCategory[];
          inquiry_body: string | null;
          status: DealStatus;
          lost_reason: string | null;
          won_reason: string | null;
          won_at: string | null;
          assigned_user_id: string | null;
          custom_fields: Json;
          form_id: string | null;
          estimate_submitted_at: string | null;
          stale_estimate_notified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          person_id: string;
          source: DealSource;
          job_categories?: JobCategory[];
          inquiry_body?: string | null;
          status: DealStatus;
          lost_reason?: string | null;
          won_reason?: string | null;
          won_at?: string | null;
          assigned_user_id?: string | null;
          custom_fields?: Json;
          form_id?: string | null;
          estimate_submitted_at?: string | null;
          stale_estimate_notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deals"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "deals_person_id_fkey";
            columns: ["person_id"];
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_assigned_user_id_fkey";
            columns: ["assigned_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_form_id_fkey";
            columns: ["form_id"];
            referencedRelation: "form_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      // supabase/migrations/20260910100000_deal_estimate_submitted_and_assignees.sql
      // 主担当は既存のdeals.assigned_user_idのまま。ここにはサブ担当のみ入る。
      deal_assignees: {
        Row: {
          id: string;
          deal_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deal_assignees"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "deal_assignees_deal_id_fkey";
            columns: ["deal_id"];
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_assignees_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          // supabase/migrations/20260910130000_deal_project_short_numbers.sql
          number: number;
          company_id: string;
          contact_id: string | null;
          deal_id: string | null;
          title: string;
          budget: number | null;
          start_date: string | null;
          end_date: string | null;
          status: ProjectStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          contact_id?: string | null;
          deal_id?: string | null;
          title: string;
          budget?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          status: ProjectStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_contact_id_fkey";
            columns: ["contact_id"];
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_deal_id_fkey";
            columns: ["deal_id"];
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
        ];
      };
      project_assignees: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: AssigneeRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role: AssigneeRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_assignees"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "project_assignees_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_assignees_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      project_roles: {
        Row: {
          id: string;
          project_id: string;
          job_category: JobCategory;
          headcount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          job_category: JobCategory;
          headcount: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_roles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "project_roles_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      freelancers: {
        Row: {
          id: string;
          platform_freelancer_id: string;
          name: string;
          email: string | null;
          job_categories: JobCategory[] | null;
          last_imported_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          platform_freelancer_id: string;
          name: string;
          email?: string | null;
          job_categories?: JobCategory[] | null;
          last_imported_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["freelancers"]["Insert"]>;
        Relationships: [];
      };
      project_role_assignments: {
        Row: {
          id: string;
          project_role_id: string;
          freelancer_id: string;
          assigned_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_role_id: string;
          freelancer_id: string;
          assigned_at: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_role_assignments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "project_role_assignments_project_role_id_fkey";
            columns: ["project_role_id"];
            referencedRelation: "project_roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_role_assignments_freelancer_id_fkey";
            columns: ["freelancer_id"];
            referencedRelation: "freelancers";
            referencedColumns: ["id"];
          },
        ];
      };
      csv_imports: {
        Row: {
          id: string;
          target_table: "freelancers";
          file_name: string;
          imported_by: string;
          row_count: number;
          success_count: number;
          error_count: number;
          error_log: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_table: "freelancers";
          file_name: string;
          imported_by: string;
          row_count: number;
          success_count: number;
          error_count: number;
          error_log?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["csv_imports"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "csv_imports_imported_by_fkey";
            columns: ["imported_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      estimates: {
        Row: {
          id: string;
          project_id: string;
          document_type: EstimateDocumentType;
          amount: number;
          pdf_url: string | null;
          cloudsign_document_id: string | null;
          misoca_document_id: string | null;
          contract_status: ContractStatus;
          sent_at: string | null;
          signed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          document_type: EstimateDocumentType;
          amount: number;
          pdf_url?: string | null;
          cloudsign_document_id?: string | null;
          misoca_document_id?: string | null;
          contract_status: ContractStatus;
          sent_at?: string | null;
          signed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["estimates"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "estimates_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_notes: {
        Row: {
          id: string;
          project_id: string | null;
          // supabase/migrations/20260910090000_meeting_upload_and_deal_links.sql (company_idから置き換え)
          deal_id: string | null;
          title: string;
          meeting_at: string;
          source: MeetingNoteSource;
          transcript_url: string | null;
          ai_summary: string;
          // supabase/migrations/20260910120000_meeting_note_summary_sections.sql
          ai_summary_sections: Json | null;
          transcript_text: string | null;
          action_items: Json;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          deal_id?: string | null;
          title: string;
          meeting_at: string;
          source: MeetingNoteSource;
          transcript_url?: string | null;
          ai_summary: string;
          ai_summary_sections?: Json | null;
          transcript_text?: string | null;
          action_items?: Json;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["meeting_notes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "meeting_notes_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_notes_deal_id_fkey";
            columns: ["deal_id"];
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_notes_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      // supabase/migrations/20260910090000_meeting_upload_and_deal_links.sql
      meeting_note_uploads: {
        Row: {
          id: string;
          title: string;
          meeting_at: string;
          project_id: string | null;
          deal_id: string | null;
          assemblyai_transcript_id: string | null;
          status: MeetingUploadStatus;
          meeting_note_id: string | null;
          error_message: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          meeting_at: string;
          project_id?: string | null;
          deal_id?: string | null;
          assemblyai_transcript_id?: string | null;
          status?: MeetingUploadStatus;
          meeting_note_id?: string | null;
          error_message?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["meeting_note_uploads"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "meeting_note_uploads_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_note_uploads_deal_id_fkey";
            columns: ["deal_id"];
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_note_uploads_meeting_note_id_fkey";
            columns: ["meeting_note_id"];
            referencedRelation: "meeting_notes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_note_uploads_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      // supabase/migrations/20260907070000_misoca_oauth_tokens.sql
      misoca_oauth_tokens: {
        Row: {
          id: boolean;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          connected_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          connected_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["misoca_oauth_tokens"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "misoca_oauth_tokens_connected_by_fkey";
            columns: ["connected_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          project_id: string;
          company_id: string;
          freee_invoice_id: string | null;
          misoca_invoice_id: string | null;
          amount: number;
          issued_date: string | null;
          due_date: string | null;
          payment_status: PaymentStatus;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          company_id: string;
          freee_invoice_id?: string | null;
          misoca_invoice_id?: string | null;
          amount: number;
          issued_date?: string | null;
          due_date?: string | null;
          payment_status: PaymentStatus;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_settings: {
        Row: {
          id: string;
          event_type: NotificationEventType;
          slack_channel_id: string;
          message_template: string;
          is_active: boolean;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_type: NotificationEventType;
          slack_channel_id: string;
          message_template: string;
          is_active?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_settings"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "notification_settings_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          event_type: NotificationEventType;
          title: string;
          link_path: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: NotificationEventType;
          title: string;
          link_path?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          name: string;
          metrics: Json;
          filters: Json | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          metrics: Json;
          filters?: Json | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      report_schedules: {
        Row: {
          id: string;
          report_id: string;
          frequency: ReportFrequency;
          day_of_week: number | null;
          day_of_month: number | null;
          time_of_day: string;
          slack_channel_id: string;
          message_template: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          frequency: ReportFrequency;
          day_of_week?: number | null;
          day_of_month?: number | null;
          time_of_day: string;
          slack_channel_id: string;
          message_template: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["report_schedules"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "report_schedules_report_id_fkey";
            columns: ["report_id"];
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
        ];
      };
      report_runs: {
        Row: {
          id: string;
          report_id: string;
          schedule_id: string | null;
          generated_at: string;
          result_snapshot: Json;
          status: ReportRunStatus;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          report_id: string;
          schedule_id?: string | null;
          generated_at?: string;
          result_snapshot: Json;
          status: ReportRunStatus;
          error_message?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["report_runs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "report_runs_report_id_fkey";
            columns: ["report_id"];
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_runs_schedule_id_fkey";
            columns: ["schedule_id"];
            referencedRelation: "report_schedules";
            referencedColumns: ["id"];
          },
        ];
      };
      user_page_permissions: {
        Row: {
          id: string;
          user_id: string;
          page_key: string;
          permission: PagePermission;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          page_key: string;
          permission: PagePermission;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_page_permissions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_page_permissions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_page_permissions_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_logs: {
        Row: {
          id: string;
          integration_type: IntegrationType;
          direction: IntegrationDirection;
          related_entity_type: IntegrationRelatedEntityType | null;
          related_entity_id: string | null;
          payload: Json;
          status: IntegrationLogStatus;
          error_message: string | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          integration_type: IntegrationType;
          direction: IntegrationDirection;
          related_entity_type?: IntegrationRelatedEntityType | null;
          related_entity_id?: string | null;
          payload: Json;
          status: IntegrationLogStatus;
          error_message?: string | null;
          occurred_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["integration_logs"]["Insert"]>;
        Relationships: [];
      };
      // supabase/migrations/20260908110000_form_builder.sql, updated by
      // supabase/migrations/20260911090000_form_public_defaults.sql (number列を追加)、
      // supabase/migrations/20260911140000_form_auto_reply_email.sql (自動返信メール列を追加)
      form_definitions: {
        Row: {
          id: string;
          // URL用の短い連番(generated always as identityのためInsertには含めない)。
          number: number;
          name: string;
          auto_reply_enabled: boolean;
          auto_reply_subject: string | null;
          auto_reply_body: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          auto_reply_enabled?: boolean;
          auto_reply_subject?: string | null;
          auto_reply_body?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["form_definitions"]["Insert"]>;
        Relationships: [];
      };
      // supabase/migrations/20260908110000_form_builder.sql
      form_fields: {
        Row: {
          id: string;
          form_id: string;
          field_key: string;
          is_builtin: boolean;
          label: string;
          answer_type: FormAnswerType;
          options: Json | null;
          is_required: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          field_key: string;
          is_builtin?: boolean;
          label: string;
          answer_type: FormAnswerType;
          options?: Json | null;
          is_required?: boolean;
          sort_order: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["form_fields"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey";
            columns: ["form_id"];
            referencedRelation: "form_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      // supabase/migrations/20260911090000_form_public_defaults.sql
      organization_settings: {
        Row: {
          id: boolean;
          company_name: string | null;
          logo_url: string | null;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          company_name?: string | null;
          logo_url?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organization_settings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      // supabase/migrations/20260902034903_company_list_view.sql, updated by
      // supabase/migrations/20260909090000_deals_people_split.sql (status/担当者列を廃止)
      company_list_view: {
        Row: {
          id: string;
          name: string;
          industry: string | null;
          created_at: string;
          updated_at: string;
          latest_project_title: string | null;
        };
        Relationships: [];
      };
      // supabase/migrations/20260902042407_project_list_view.sql, updated by
      // supabase/migrations/20260906080000_project_date_range.sql
      project_list_view: {
        Row: {
          id: string;
          company_id: string;
          company_name: string;
          title: string;
          status: ProjectStatus;
          budget: number | null;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
          assignee_id: string | null;
          assignee_name: string | null;
          role_summary: { job_category: JobCategory; headcount: number }[];
          // supabase/migrations/20260910130000_deal_project_short_numbers.sql
          number: number;
        };
        Relationships: [];
      };
      // supabase/migrations/20260905070000_contact_list_view.sql、
      // supabase/migrations/20260909090000_deals_people_split.sql で deals_list_view に置き換え
      deals_list_view: {
        Row: {
          id: string;
          person_id: string;
          name: string;
          company_name: string | null;
          source: DealSource;
          job_categories: JobCategory[];
          status: DealStatus;
          assigned_user_id: string | null;
          assignee_name: string | null;
          created_at: string;
          updated_at: string;
          // supabase/migrations/20260910090000_meeting_upload_and_deal_links.sql
          company_id: string | null;
          // supabase/migrations/20260910130000_deal_project_short_numbers.sql
          number: number;
        };
        Relationships: [];
      };
      // supabase/migrations/20260907170000_estimate_list_view.sql
      estimate_list_view: {
        Row: {
          id: string;
          document_type: EstimateDocumentType;
          amount: number;
          contract_status: ContractStatus;
          created_at: string;
          project_id: string;
          project_title: string;
          company_id: string;
          company_name: string;
          // supabase/migrations/20260910130000_deal_project_short_numbers.sql
          project_number: number;
        };
        Relationships: [];
      };
      // supabase/migrations/20260905090000_freelancer_list_view.sql
      freelancer_list_view: {
        Row: {
          id: string;
          platform_freelancer_id: string;
          name: string;
          email: string | null;
          job_categories: JobCategory[] | null;
          last_imported_at: string | null;
          created_at: string;
          updated_at: string;
          active_project_count: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
