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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          description: string
          id: string
          table_num: number | null
          type: string
        }
        Insert: {
          account_id: string
          amount?: number
          created_at?: string
          description?: string
          id?: string
          table_num?: number | null
          type?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          description?: string
          id?: string
          table_num?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          balance: number
          created_at: string
          id: string
          name: string
          note: string
          phone: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          name: string
          note?: string
          phone?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          name?: string
          note?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      loyalty_settings: {
        Row: {
          id: string
          min_redeem_points: number
          point_value: number
          points_per_lira: number
          updated_at: string
        }
        Insert: {
          id?: string
          min_redeem_points?: number
          point_value?: number
          points_per_lira?: number
          updated_at?: string
        }
        Update: {
          id?: string
          min_redeem_points?: number
          point_value?: number
          points_per_lira?: number
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string
          id: string
          last_visit_at: string | null
          name: string
          phone: string
          total_points: number
          total_spent: number
          updated_at: string
          used_points: number
          visit_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_visit_at?: string | null
          name?: string
          phone: string
          total_points?: number
          total_spent?: number
          updated_at?: string
          used_points?: number
          visit_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_visit_at?: string | null
          name?: string
          phone?: string
          total_points?: number
          total_spent?: number
          updated_at?: string
          used_points?: number
          visit_count?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          id: string
          items: Json
          member_id: string | null
          note: string | null
          payment_status: string
          payment_type: string
          status: string
          table_num: number
          total: number
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          member_id?: string | null
          note?: string | null
          payment_status?: string
          payment_type?: string
          status?: string
          table_num: number
          total?: number
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          member_id?: string | null
          note?: string | null
          payment_status?: string
          payment_type?: string
          status?: string
          table_num?: number
          total?: number
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          created_at: string
          description: string
          id: string
          member_id: string
          order_id: string | null
          points: number
          type: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          member_id: string
          order_id?: string | null
          points?: number
          type?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          member_id?: string
          order_id?: string | null
          points?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      printers: {
        Row: {
          auto_print_categories: string[]
          created_at: string
          footer_text: string
          header_text: string
          id: string
          ip_address: string
          is_active: boolean
          is_default: boolean
          name: string
          paper_size: string
        }
        Insert: {
          auto_print_categories?: string[]
          created_at?: string
          footer_text?: string
          header_text?: string
          id?: string
          ip_address?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          paper_size?: string
        }
        Update: {
          auto_print_categories?: string[]
          created_at?: string
          footer_text?: string
          header_text?: string
          id?: string
          ip_address?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          paper_size?: string
        }
        Relationships: []
      }
      product_options: {
        Row: {
          created_at: string
          extra_price: number
          id: string
          name: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          extra_price?: number
          id?: string
          name: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          extra_price?: number
          id?: string
          name?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string
          id: string
          is_available: boolean
          name: string
          price: number
          sort_order: number
          tag: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_available?: boolean
          name: string
          price?: number
          sort_order?: number
          tag?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
          tag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          auto_print_enabled: boolean
          card_enabled: boolean
          cash_enabled: boolean
          id: string
          paper_size: string
          pos_enabled: boolean
          printer_name: string
          sound_enabled: boolean
          updated_at: string
          waiter_enabled: boolean
        }
        Insert: {
          auto_print_enabled?: boolean
          card_enabled?: boolean
          cash_enabled?: boolean
          id?: string
          paper_size?: string
          pos_enabled?: boolean
          printer_name?: string
          sound_enabled?: boolean
          updated_at?: string
          waiter_enabled?: boolean
        }
        Update: {
          auto_print_enabled?: boolean
          card_enabled?: boolean
          cash_enabled?: boolean
          id?: string
          paper_size?: string
          pos_enabled?: boolean
          printer_name?: string
          sound_enabled?: boolean
          updated_at?: string
          waiter_enabled?: boolean
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          pin: string
          shift_end: string
          shift_start: string
          user_id: string | null
          username: string
          work_days: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          pin?: string
          shift_end?: string
          shift_start?: string
          user_id?: string | null
          username: string
          work_days?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          pin?: string
          shift_end?: string
          shift_start?: string
          user_id?: string | null
          username?: string
          work_days?: string[]
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          enabled: boolean
          id: string
          perm_key: string
          staff_id: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          perm_key: string
          staff_id: string
        }
        Update: {
          enabled?: boolean
          id?: string
          perm_key?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      table_areas: {
        Row: {
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      table_logs: {
        Row: {
          action: string
          amount: number | null
          created_at: string
          details: string | null
          id: string
          payment_type: string | null
          table_num: number
          user_name: string
        }
        Insert: {
          action: string
          amount?: number | null
          created_at?: string
          details?: string | null
          id?: string
          payment_type?: string | null
          table_num: number
          user_name?: string
        }
        Update: {
          action?: string
          amount?: number | null
          created_at?: string
          details?: string | null
          id?: string
          payment_type?: string | null
          table_num?: number
          user_name?: string
        }
        Relationships: []
      }
      tables: {
        Row: {
          area_id: string | null
          capacity: number
          id: string
          is_active: boolean
          name: string
          table_num: number
        }
        Insert: {
          area_id?: string | null
          capacity?: number
          id?: string
          is_active?: boolean
          name?: string
          table_num: number
        }
        Update: {
          area_id?: string | null
          capacity?: number
          id?: string
          is_active?: boolean
          name?: string
          table_num?: number
        }
        Relationships: [
          {
            foreignKeyName: "tables_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "table_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_staff_permission: { Args: { _perm_key: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_pin: { Args: { plain_pin: string }; Returns: string }
      verify_pin: {
        Args: { p_staff_id: string; plain_pin: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
