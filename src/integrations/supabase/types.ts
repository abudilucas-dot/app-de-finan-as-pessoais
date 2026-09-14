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
      accounts: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          initial_balance: number
          institution: string | null
          is_archived: boolean
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          initial_balance?: number
          institution?: string | null
          is_archived?: boolean
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          initial_balance?: number
          institution?: string | null
          is_archived?: boolean
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount_limit: number
          category_id: string
          created_at: string
          id: string
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_limit: number
          category_id: string
          created_at?: string
          id?: string
          period_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_limit?: number
          category_id?: string
          created_at?: string
          id?: string
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_default: boolean
          name: string
          type: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          name: string
          type: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          name?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      credit_card_invoices: {
        Row: {
          created_at: string
          credit_card_id: string
          cycle_end: string
          cycle_start: string
          due_date: string
          id: string
          paid_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_card_id: string
          cycle_end: string
          cycle_start: string
          due_date: string
          id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_card_id?: string
          cycle_end?: string
          cycle_start?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_invoices_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_card_summaries"
            referencedColumns: ["credit_card_id"]
          },
          {
            foreignKeyName: "credit_card_invoices_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          brand: string | null
          closing_day: number
          color: string | null
          created_at: string
          default_payment_account_id: string | null
          due_day: number
          id: string
          institution: string | null
          is_archived: boolean
          name: string
          total_limit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          closing_day: number
          color?: string | null
          created_at?: string
          default_payment_account_id?: string | null
          due_day: number
          id?: string
          institution?: string | null
          is_archived?: boolean
          name: string
          total_limit: number
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          closing_day?: number
          color?: string | null
          created_at?: string
          default_payment_account_id?: string | null
          due_day?: number
          id?: string
          institution?: string | null
          is_archived?: boolean
          name?: string
          total_limit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_default_payment_account_id_fkey"
            columns: ["default_payment_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "credit_cards_default_payment_account_id_fkey"
            columns: ["default_payment_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      debit_cards: {
        Row: {
          account_id: string
          brand: string | null
          color: string | null
          created_at: string
          id: string
          institution: string | null
          is_archived: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          brand?: string | null
          color?: string | null
          created_at?: string
          id?: string
          institution?: string | null
          is_archived?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          brand?: string | null
          color?: string | null
          created_at?: string
          id?: string
          institution?: string | null
          is_archived?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debit_cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "debit_cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_contributions: {
        Row: {
          account_id: string | null
          amount: number
          contribution_date: string
          created_at: string
          goal_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          contribution_date?: string
          created_at?: string
          goal_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          contribution_date?: string
          created_at?: string
          goal_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "goal_contributions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "financial_goal_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "financial_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          financial_objective: string | null
          full_name: string | null
          id: string
          monthly_income: number | null
          onboarding_completed: boolean
          payday: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          financial_objective?: string | null
          full_name?: string | null
          id?: string
          monthly_income?: number | null
          onboarding_completed?: boolean
          payday?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          financial_objective?: string | null
          full_name?: string | null
          id?: string
          monthly_income?: number | null
          onboarding_completed?: boolean
          payday?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          debit_card_id: string | null
          description: string
          destination_account_id: string | null
          id: string
          installment_group_id: string | null
          installment_number: number | null
          invoice_id: string | null
          notes: string | null
          status: string
          total_installments: number | null
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          debit_card_id?: string | null
          description: string
          destination_account_id?: string | null
          id?: string
          installment_group_id?: string | null
          installment_number?: number | null
          invoice_id?: string | null
          notes?: string | null
          status?: string
          total_installments?: number | null
          transaction_date?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          debit_card_id?: string | null
          description?: string
          destination_account_id?: string | null
          id?: string
          installment_group_id?: string | null
          installment_number?: number | null
          invoice_id?: string | null
          notes?: string | null
          status?: string
          total_installments?: number | null
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_card_summaries"
            referencedColumns: ["credit_card_id"]
          },
          {
            foreignKeyName: "transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_debit_card_id_fkey"
            columns: ["debit_card_id"]
            isOneToOne: false
            referencedRelation: "debit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "credit_card_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          currency: string
          hide_values: boolean
          id: string
          locale: string
          theme: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          hide_values?: boolean
          id?: string
          locale?: string
          theme?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          hide_values?: boolean
          id?: string
          locale?: string
          theme?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      account_balances: {
        Row: {
          account_id: string | null
          current_balance: number | null
          user_id: string | null
        }
        Relationships: []
      }
      budget_summaries: {
        Row: {
          amount_limit: number | null
          category_id: string | null
          id: string | null
          period_start: string | null
          spent_amount: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_summaries: {
        Row: {
          available_limit: number | null
          credit_card_id: string | null
          outstanding_balance: number | null
          total_limit: number | null
          user_id: string | null
        }
        Relationships: []
      }
      financial_goal_summaries: {
        Row: {
          color: string | null
          contribution_count: number | null
          created_at: string | null
          current_amount: number | null
          id: string | null
          name: string | null
          status: string | null
          target_amount: number | null
          target_date: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_card_expense: {
        Args: {
          p_amount: number
          p_category_id: string
          p_credit_card_id: string
          p_description: string
          p_notes?: string
          p_transaction_date: string
        }
        Returns: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          debit_card_id: string | null
          description: string
          destination_account_id: string | null
          id: string
          installment_group_id: string | null
          installment_number: number | null
          invoice_id: string | null
          notes: string | null
          status: string
          total_installments: number | null
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_card_installment_expense: {
        Args: {
          p_amount: number
          p_category_id: string
          p_credit_card_id: string
          p_description: string
          p_notes?: string
          p_total_installments?: number
          p_transaction_date: string
        }
        Returns: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          debit_card_id: string | null
          description: string
          destination_account_id: string | null
          id: string
          installment_group_id: string | null
          installment_number: number | null
          invoice_id: string | null
          notes: string | null
          status: string
          total_installments: number | null
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_credit_card_purchase: {
        Args: { p_transaction_id: string }
        Returns: number
      }
      pay_credit_card_invoice: {
        Args: {
          p_account_id: string
          p_invoice_id: string
          p_payment_date?: string
        }
        Returns: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          debit_card_id: string | null
          description: string
          destination_account_id: string | null
          id: string
          installment_group_id: string | null
          installment_number: number | null
          invoice_id: string | null
          notes: string | null
          status: string
          total_installments: number | null
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      replace_credit_card_purchase: {
        Args: {
          p_amount: number
          p_category_id: string
          p_credit_card_id: string
          p_description: string
          p_notes?: string
          p_total_installments?: number
          p_transaction_date: string
          p_transaction_id: string
        }
        Returns: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          debit_card_id: string | null
          description: string
          destination_account_id: string | null
          id: string
          installment_group_id: string | null
          installment_number: number | null
          invoice_id: string | null
          notes: string | null
          status: string
          total_installments: number | null
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
