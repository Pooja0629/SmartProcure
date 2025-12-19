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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      component_suppliers: {
        Row: {
          component_id: string
          created_at: string
          id: string
          is_primary: boolean
          lead_time_days: number
          min_order_quantity: number
          reliability_score: number | null
          supplier_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          component_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          lead_time_days?: number
          min_order_quantity?: number
          reliability_score?: number | null
          supplier_id: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          component_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          lead_time_days?: number
          min_order_quantity?: number
          reliability_score?: number | null
          supplier_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_suppliers_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      components: {
        Row: {
          category: string
          created_at: string
          criticality_score: number | null
          current_stock: number
          id: string
          lead_time_days: number
          min_stock: number
          name: string
          optimal_inventory_level: number | null
          reorder_quantity: number | null
          safety_stock: number | null
          shelf_life_months: number | null
          supplier_id: string | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          criticality_score?: number | null
          current_stock?: number
          id?: string
          lead_time_days?: number
          min_stock?: number
          name: string
          optimal_inventory_level?: number | null
          reorder_quantity?: number | null
          safety_stock?: number | null
          shelf_life_months?: number | null
          supplier_id?: string | null
          unit_cost: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          criticality_score?: number | null
          current_stock?: number
          id?: string
          lead_time_days?: number
          min_stock?: number
          name?: string
          optimal_inventory_level?: number | null
          reorder_quantity?: number | null
          safety_stock?: number | null
          shelf_life_months?: number | null
          supplier_id?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "components_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_history: {
        Row: {
          alert_type: string
          component_id: string
          created_at: string
          email_body: string
          final_quantity: number | null
          id: string
          modified_by_manager: boolean | null
          original_quantity: number | null
          sent_at: string
          sent_to: string
          status: string
          subject: string
          supplier_id: string
        }
        Insert: {
          alert_type: string
          component_id: string
          created_at?: string
          email_body: string
          final_quantity?: number | null
          id?: string
          modified_by_manager?: boolean | null
          original_quantity?: number | null
          sent_at?: string
          sent_to: string
          status?: string
          subject: string
          supplier_id: string
        }
        Update: {
          alert_type?: string
          component_id?: string
          created_at?: string
          email_body?: string
          final_quantity?: number | null
          id?: string
          modified_by_manager?: boolean | null
          original_quantity?: number | null
          sent_at?: string
          sent_to?: string
          status?: string
          subject?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_history_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          auto_send_enabled: boolean | null
          created_at: string
          critical_threshold_percent: number | null
          id: string
          low_stock_threshold_percent: number | null
          reorder_threshold_percent: number | null
          sender_email: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_send_enabled?: boolean | null
          created_at?: string
          critical_threshold_percent?: number | null
          id?: string
          low_stock_threshold_percent?: number | null
          reorder_threshold_percent?: number | null
          sender_email?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_send_enabled?: boolean | null
          created_at?: string
          critical_threshold_percent?: number | null
          id?: string
          low_stock_threshold_percent?: number | null
          reorder_threshold_percent?: number | null
          sender_email?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          component_id: string
          created_at: string
          id: string
          order_date: string
          quantity: number
          status: string
          supplier_id: string
        }
        Insert: {
          component_id: string
          created_at?: string
          id?: string
          order_date?: string
          quantity: number
          status?: string
          supplier_id: string
        }
        Update: {
          component_id?: string
          created_at?: string
          id?: string
          order_date?: string
          quantity?: number
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_price_history: {
        Row: {
          component_supplier_id: string
          id: string
          recorded_at: string
          unit_price: number
        }
        Insert: {
          component_supplier_id: string
          id?: string
          recorded_at?: string
          unit_price: number
        }
        Update: {
          component_supplier_id?: string
          id?: string
          recorded_at?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_price_history_component_supplier_id_fkey"
            columns: ["component_supplier_id"]
            isOneToOne: false
            referencedRelation: "component_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          rating: number | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          rating?: number | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      usage_history: {
        Row: {
          component_id: string
          created_at: string
          date: string
          id: string
          units_used: number
        }
        Insert: {
          component_id: string
          created_at?: string
          date: string
          id?: string
          units_used: number
        }
        Update: {
          component_id?: string
          created_at?: string
          date?: string
          id?: string
          units_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_history_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
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
