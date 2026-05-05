export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          bank_account: string | null
          company_name: string
          created_at: string
          id: string
          inn: string | null
          logo_url: string | null
          telegram_archive_link: string | null
          telegram_archive_zips: string[]
          updated_at: string
        }
        Insert: {
          bank_account?: string | null
          company_name: string
          created_at?: string
          id?: string
          inn?: string | null
          logo_url?: string | null
          telegram_archive_link?: string | null
          telegram_archive_zips?: string[]
          updated_at?: string
        }
        Update: {
          bank_account?: string | null
          company_name?: string
          created_at?: string
          id?: string
          inn?: string | null
          logo_url?: string | null
          telegram_archive_link?: string | null
          telegram_archive_zips?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      monthly_results: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          month: number
          results_table_data: Json | null
          total_stats: string | null
          updated_at: string
          uploaded_docs_urls: string[] | null
          year: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          month: number
          results_table_data?: Json | null
          total_stats?: string | null
          updated_at?: string
          uploaded_docs_urls?: string[] | null
          year: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          month?: number
          results_table_data?: Json | null
          total_stats?: string | null
          updated_at?: string
          uploaded_docs_urls?: string[] | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_results_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_type: string | null
          receipt_url: string | null
          worker_id: string | null
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_type?: string | null
          receipt_url?: string | null
          worker_id?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_type?: string | null
          receipt_url?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          contract_url: string | null
          created_at: string
          id: string
          invoice_url: string | null
          project_name: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          contract_url?: string | null
          created_at?: string
          id?: string
          invoice_url?: string | null
          project_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          contract_url?: string | null
          created_at?: string
          id?: string
          invoice_url?: string | null
          project_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      promocodes: {
        Row: {
          code: string
          created_at: string
          id: string
          worker_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          worker_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promocodes_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          birth_date: string | null
          created_at: string
          e_signature_file_url: string | null
          e_signature_key: string | null
          e_signature_password: string | null
          full_name: string
          id: string
          passport_back_url: string | null
          passport_front_url: string | null
          passport_number: string | null
          passport_series_number: string | null
          phone_number: string | null
          plastic_card_info: string | null
          position: string | null
          residence_address: string | null
          residence_file_url: string | null
          social_media_assets: Json | null
          telegram_username: string | null
          temp_living_addresses: string[] | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          e_signature_file_url?: string | null
          e_signature_key?: string | null
          e_signature_password?: string | null
          full_name: string
          id?: string
          passport_back_url?: string | null
          passport_front_url?: string | null
          passport_number?: string | null
          passport_series_number?: string | null
          phone_number?: string | null
          plastic_card_info?: string | null
          position?: string | null
          residence_address?: string | null
          residence_file_url?: string | null
          social_media_assets?: Json | null
          telegram_username?: string | null
          temp_living_addresses?: string[] | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          e_signature_file_url?: string | null
          e_signature_key?: string | null
          e_signature_password?: string | null
          full_name?: string
          id?: string
          passport_back_url?: string | null
          passport_front_url?: string | null
          passport_number?: string | null
          passport_series_number?: string | null
          phone_number?: string | null
          plastic_card_info?: string | null
          position?: string | null
          residence_address?: string | null
          residence_file_url?: string | null
          social_media_assets?: Json | null
          telegram_username?: string | null
          temp_living_addresses?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
