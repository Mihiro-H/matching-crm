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
export type CompanyStatus = "negotiating" | "active" | "paused" | "cold";
export type ContactSource = "form" | "referral" | "other";
export type JobCategory = "writer" | "photographer" | "marketer" | "designer";
export type ContactStatus = "new" | "in_progress" | "negotiating" | "won" | "lost";
export type ProjectStatus =
  | "negotiating"
  | "estimate_submitted"
  | "contract_sent"
  | "contracted"
  | "in_progress"
  | "inspected"
  | "payment_pending"
  | "completed";
export type AssigneeRole = "primary" | "secondary";
export type EstimateDocumentType = "estimate" | "order";
export type ContractStatus = "draft" | "sent" | "signed" | "rejected";
export type MeetingNoteSource = "zoom" | "upload" | "manual";
export type PaymentStatus = "not_invoiced" | "invoiced" | "unpaid" | "paid";
export type NotificationEventType =
  | "new_lead"
  | "contract_signed"
  | "payment_confirmed"
  | "reminder";
export type ReportFrequency = "weekly" | "monthly";
export type ReportRunStatus = "success" | "failed";
export type IntegrationType = "form" | "cloudsign" | "freee" | "slack" | "zoom";
export type IntegrationDirection = "inbound" | "outbound";
export type IntegrationRelatedEntityType = "contact" | "project" | "estimate" | "invoice" | "meeting_note";
export type IntegrationLogStatus = "success" | "failed" | "retrying";

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
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role: UserRole;
          department_id?: string | null;
          slack_user_id?: string | null;
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
          status: CompanyStatus;
          first_contact_date: string | null;
          platform_account_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          industry?: string | null;
          status: CompanyStatus;
          first_contact_date?: string | null;
          platform_account_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          company_id: string | null;
          company_name_raw: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          source: ContactSource;
          job_categories: JobCategory[];
          inquiry_body: string | null;
          status: ContactStatus;
          lost_reason: string | null;
          is_current: boolean;
          assigned_user_id: string | null;
          started_at: string | null;
          ended_at: string | null;
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
          source: ContactSource;
          job_categories?: JobCategory[];
          inquiry_body?: string | null;
          status: ContactStatus;
          lost_reason?: string | null;
          is_current?: boolean;
          assigned_user_id?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contacts_assigned_user_id_fkey";
            columns: ["assigned_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          company_id: string;
          contact_id: string | null;
          title: string;
          budget: number | null;
          deadline: string | null;
          status: ProjectStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          contact_id?: string | null;
          title: string;
          budget?: number | null;
          deadline?: string | null;
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
            referencedRelation: "contacts";
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
          contact_id: string | null;
          title: string;
          meeting_at: string;
          source: MeetingNoteSource;
          transcript_url: string | null;
          ai_summary: string;
          action_items: Json;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          contact_id?: string | null;
          title: string;
          meeting_at: string;
          source: MeetingNoteSource;
          transcript_url?: string | null;
          ai_summary: string;
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
            foreignKeyName: "meeting_notes_contact_id_fkey";
            columns: ["contact_id"];
            referencedRelation: "contacts";
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
      invoices: {
        Row: {
          id: string;
          project_id: string;
          company_id: string;
          freee_invoice_id: string | null;
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
    };
    Views: {
      // supabase/migrations/20260902034903_company_list_view.sql
      company_list_view: {
        Row: {
          id: string;
          name: string;
          industry: string | null;
          status: CompanyStatus;
          created_at: string;
          updated_at: string;
          latest_project_title: string | null;
          assignee_id: string | null;
          assignee_name: string | null;
        };
        Relationships: [];
      };
      // supabase/migrations/20260902042407_project_list_view.sql
      project_list_view: {
        Row: {
          id: string;
          company_id: string;
          company_name: string;
          title: string;
          status: ProjectStatus;
          budget: number | null;
          deadline: string | null;
          created_at: string;
          updated_at: string;
          assignee_id: string | null;
          assignee_name: string | null;
          role_summary: { job_category: JobCategory; headcount: number }[];
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
