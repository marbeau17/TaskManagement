// =============================================================================
// Supabase Database type definitions
// Maps to the actual Supabase schema for type-safe queries.
//
// To regenerate from a live database, run:
//   npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          name_short: string
          role: string
          avatar_color: string
          weekly_capacity_hours: number
          is_active: boolean
          must_change_password: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          name_short: string
          role: string
          avatar_color?: string
          weekly_capacity_hours?: number
          is_active?: boolean
          must_change_password?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          name_short?: string
          role?: string
          avatar_color?: string
          weekly_capacity_hours?: number
          is_active?: boolean
          must_change_password?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          client_id: string
          title: string
          description: string | null
          status: string
          progress: number
          requested_by: string
          assigned_to: string | null
          director_id: string | null
          desired_deadline: string | null
          confirmed_deadline: string | null
          estimated_hours: number | null
          actual_hours: number
          reference_url: string | null
          is_draft: boolean
          template_id: string | null
          template_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          description?: string | null
          status?: string
          progress?: number
          requested_by: string
          assigned_to?: string | null
          director_id?: string | null
          desired_deadline?: string | null
          confirmed_deadline?: string | null
          estimated_hours?: number | null
          actual_hours?: number
          reference_url?: string | null
          is_draft?: boolean
          template_id?: string | null
          template_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          description?: string | null
          status?: string
          progress?: number
          requested_by?: string
          assigned_to?: string | null
          director_id?: string | null
          desired_deadline?: string | null
          confirmed_deadline?: string | null
          estimated_hours?: number | null
          actual_hours?: number
          reference_url?: string | null
          is_draft?: boolean
          template_id?: string | null
          template_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_requested_by_fkey'
            columns: ['requested_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_director_id_fkey'
            columns: ['director_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'task_templates'
            referencedColumns: ['id']
          },
        ]
      }
      task_templates: {
        Row: {
          id: string
          name: string
          category: string
          fields: Json
          is_default: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          fields: Json
          is_default?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          fields?: Json
          is_default?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_templates_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      comments: {
        Row: {
          id: string
          task_id: string
          user_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          body?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      activity_logs: {
        Row: {
          id: string
          task_id: string
          user_id: string
          action: string
          detail: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          action: string
          detail?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          action?: string
          detail?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_logs_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      custom_roles: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          id: string
          task_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_assignees_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_assignees_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      backlog_items: {
        Row: {
          id: string
          project_id: string | null
          title: string
          description: string | null
          priority: number
          estimated_hours: number | null
          status: string
          assignee_id: string | null
          promoted_task_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          title: string
          description?: string | null
          priority?: number
          estimated_hours?: number | null
          status?: string
          assignee_id?: string | null
          promoted_task_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          title?: string
          description?: string | null
          priority?: number
          estimated_hours?: number | null
          status?: string
          assignee_id?: string | null
          promoted_task_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'backlog_items_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'backlog_items_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'backlog_items_promoted_task_id_fkey'
            columns: ['promoted_task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      assets: {
        Row: {
          id: string
          seq_no: number | null
          name: string
          acquired_date: string | null
          acquired_price: number | null
          management_id: string | null
          owner_name: string | null
          owner_user_id: string | null
          category: string
          status: string
          serial_number: string | null
          location: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seq_no?: number | null
          name: string
          acquired_date?: string | null
          acquired_price?: number | null
          management_id?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          category?: string
          status?: string
          serial_number?: string | null
          location?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seq_no?: number | null
          name?: string
          acquired_date?: string | null
          acquired_price?: number | null
          management_id?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          category?: string
          status?: string
          serial_number?: string | null
          location?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'assets_owner_user_id_fkey'
            columns: ['owner_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      attachments: {
        Row: {
          id: string
          task_id: string
          uploaded_by: string
          file_name: string
          file_size: number
          storage_path: string
          mime_type: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          uploaded_by: string
          file_name: string
          file_size: number
          storage_path: string
          mime_type: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          uploaded_by?: string
          file_name?: string
          file_size?: number
          storage_path?: string
          mime_type?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'attachments_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attachments_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      task_watchers: {
        Row: { id: string; task_id: string; user_id: string; created_at: string }
        Insert: { id?: string; task_id: string; user_id: string; created_at?: string }
        Update: { id?: string; task_id?: string; user_id?: string; created_at?: string }
        Relationships: [
          { foreignKeyName: 'task_watchers_task_id_fkey'; columns: ['task_id']; isOneToOne: false; referencedRelation: 'tasks'; referencedColumns: ['id'] },
          { foreignKeyName: 'task_watchers_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'users'; referencedColumns: ['id'] },
        ]
      }
      time_logs: {
        Row: { id: string; task_id: string; user_id: string; hours: number; description: string; logged_date: string; created_at: string }
        Insert: { id?: string; task_id: string; user_id: string; hours: number; description?: string; logged_date?: string; created_at?: string }
        Update: { id?: string; task_id?: string; user_id?: string; hours?: number; description?: string; logged_date?: string; created_at?: string }
        Relationships: [
          { foreignKeyName: 'time_logs_task_id_fkey'; columns: ['task_id']; isOneToOne: false; referencedRelation: 'tasks'; referencedColumns: ['id'] },
          { foreignKeyName: 'time_logs_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'users'; referencedColumns: ['id'] },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'director' | 'requester' | 'creator'
      task_status: 'waiting' | 'todo' | 'in_progress' | 'done' | 'rejected'
      avatar_color: 'av-a' | 'av-b' | 'av-c' | 'av-d' | 'av-e'
      activity_action: 'created' | 'assigned' | 'progress_updated' | 'status_changed' | 'hours_updated' | 'comment_added' | 'deadline_changed' | 'rejected'
    }
  }
}
