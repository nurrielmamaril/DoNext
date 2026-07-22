// Hand-written to match supabase/migrations/0001_init.sql, shaped the way
// `npx supabase gen types typescript` outputs for @supabase/postgrest-js v2.110+
// (requires __InternalSupabase + Relationships on every table).
// Once the Supabase project exists, regenerate with:
//   npx supabase gen types typescript --project-id <id> > lib/types/database.types.ts

export type TaskPriority = "low" | "high" | "urgent";
export type TaskStatus = "not_started" | "in_progress" | "waiting" | "completed";
export type ReminderMethod = "browser" | "email";
export type ReminderStatus = "pending" | "sent" | "dismissed" | "snoozed";

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      lists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          logo_url: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string | null;
          logo_url?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string | null;
          logo_url?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          list_id: string | null;
          title: string | null;
          content: string;
          color: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          list_id?: string | null;
          title?: string | null;
          content?: string;
          color?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          list_id?: string | null;
          title?: string | null;
          content?: string;
          color?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          list_id: string | null;
          title: string;
          description: string | null;
          priority: TaskPriority;
          status: TaskStatus;
          due_date: string | null;
          due_time: string | null;
          position: number;
          is_recurring: boolean;
          recurrence_rule: Record<string, unknown> | null;
          recurrence_parent_id: string | null;
          created_at: string;
          completed_at: string | null;
          deleted_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          list_id?: string | null;
          title: string;
          description?: string | null;
          priority?: TaskPriority;
          status?: TaskStatus;
          due_date?: string | null;
          due_time?: string | null;
          position?: number;
          is_recurring?: boolean;
          recurrence_rule?: Record<string, unknown> | null;
          recurrence_parent_id?: string | null;
          created_at?: string;
          completed_at?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          list_id?: string | null;
          title?: string;
          description?: string | null;
          priority?: TaskPriority;
          status?: TaskStatus;
          due_date?: string | null;
          due_time?: string | null;
          position?: number;
          is_recurring?: boolean;
          recurrence_rule?: Record<string, unknown> | null;
          recurrence_parent_id?: string | null;
          created_at?: string;
          completed_at?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          id: string;
          user_id: string;
          task_id: string | null;
          note_id: string | null;
          file_name: string;
          file_url: string;
          file_type: string | null;
          file_size: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id?: string | null;
          note_id?: string | null;
          file_name: string;
          file_url: string;
          file_type?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string | null;
          note_id?: string | null;
          file_name?: string;
          file_url?: string;
          file_type?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
        ];
      };
      subtasks: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          title: string;
          is_complete: boolean;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id: string;
          title: string;
          is_complete?: boolean;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string;
          title?: string;
          is_complete?: boolean;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_comments: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          remind_at: string;
          method: ReminderMethod;
          status: ReminderStatus;
          snoozed_until: string | null;
          is_recurring: boolean;
          recurrence_rule: { unit: "day" | "week" | "month"; interval: number } | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id: string;
          remind_at: string;
          method?: ReminderMethod;
          status?: ReminderStatus;
          snoozed_until?: string | null;
          is_recurring?: boolean;
          recurrence_rule?: { unit: "day" | "week" | "month"; interval: number } | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string;
          remind_at?: string;
          method?: ReminderMethod;
          status?: ReminderStatus;
          snoozed_until?: string | null;
          is_recurring?: boolean;
          recurrence_rule?: { unit: "day" | "week" | "month"; interval: number } | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reminders_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      scheduled_emails: {
        Row: {
          id: string;
          user_id: string;
          item_type: "task" | "note";
          item_id: string;
          recipient_email: string;
          subject: string | null;
          send_at: string;
          status: "pending" | "sent" | "failed";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_type: "task" | "note";
          item_id: string;
          recipient_email: string;
          subject?: string | null;
          send_at: string;
          status?: "pending" | "sent" | "failed";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_type?: "task" | "note";
          item_id?: string;
          recipient_email?: string;
          subject?: string | null;
          send_at?: string;
          status?: "pending" | "sent" | "failed";
          created_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
