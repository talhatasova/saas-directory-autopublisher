export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserPlan = 'free' | 'pro' | 'enterprise';
export type PricingModel = 'free' | 'freemium' | 'paid' | 'subscription' | 'one-time' | 'contact';
export type SubmissionType = 'form_automation' | 'direct_api' | 'assisted' | 'manual';
export type DirectoryStatus = 'active' | 'maintenance' | 'deprecated';
export type SubmissionStatus =
  | 'queued'
  | 'in_progress'
  | 'published'
  | 'action_required'
  | 'failed'
  | 'cancelled';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          plan: UserPlan;
          submissions_quota: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: UserPlan;
          submissions_quota?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: UserPlan;
          submissions_quota?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          url: string;
          tagline: string;
          description: string;
          short_description: string | null;
          category: string;
          tags: string[];
          pricing_model: PricingModel;
          logo_url: string | null;
          screenshot_urls: string[];
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          url: string;
          tagline: string;
          description: string;
          short_description?: string | null;
          category?: string;
          tags?: string[];
          pricing_model?: PricingModel;
          logo_url?: string | null;
          screenshot_urls?: string[];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          url?: string;
          tagline?: string;
          description?: string;
          short_description?: string | null;
          category?: string;
          tags?: string[];
          pricing_model?: PricingModel;
          logo_url?: string | null;
          screenshot_urls?: string[];
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      directories: {
        Row: {
          id: string;
          name: string;
          url: string;
          category: string;
          domain_rating: number;
          submission_type: SubmissionType;
          status: DirectoryStatus;
          requires_auth: boolean;
          estimated_time_sec: number;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          url: string;
          category: string;
          domain_rating: number;
          submission_type: SubmissionType;
          status?: DirectoryStatus;
          requires_auth?: boolean;
          estimated_time_sec?: number;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          url?: string;
          category?: string;
          domain_rating?: number;
          submission_type?: SubmissionType;
          status?: DirectoryStatus;
          requires_auth?: boolean;
          estimated_time_sec?: number;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      submissions: {
        Row: {
          id: string;
          project_id: string;
          directory_id: string;
          user_id: string;
          status: SubmissionStatus;
          job_id: string | null;
          listing_url: string | null;
          proof_screenshot_url: string | null;
          logs: Json;
          error_message: string | null;
          error_code: string | null;
          retry_count: number;
          action_required_payload: Json | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          directory_id: string;
          user_id: string;
          status?: SubmissionStatus;
          job_id?: string | null;
          listing_url?: string | null;
          proof_screenshot_url?: string | null;
          logs?: Json;
          error_message?: string | null;
          error_code?: string | null;
          retry_count?: number;
          action_required_payload?: Json | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          directory_id?: string;
          user_id?: string;
          status?: SubmissionStatus;
          job_id?: string | null;
          listing_url?: string | null;
          proof_screenshot_url?: string | null;
          logs?: Json;
          error_message?: string | null;
          error_code?: string | null;
          retry_count?: number;
          action_required_payload?: Json | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'submissions_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'submissions_directory_id_fkey';
            columns: ['directory_id'];
            referencedRelation: 'directories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'submissions_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_plan: UserPlan;
      pricing_model: PricingModel;
      submission_type: SubmissionType;
      directory_status: DirectoryStatus;
      submission_status: SubmissionStatus;
    };
  };
}
