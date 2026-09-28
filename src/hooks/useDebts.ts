import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Debt, DebtInput, DebtPayment, DebtSummary } from "@/lib/debts";

function invalidateDebtData(queryClient: ReturnType<typeof useQueryClient>, userId?: string) {
  queryClient.invalidateQueries({ queryKey: ["financial_debt_summaries", userId] });
  queryClient.invalidateQueries({ queryKey: ["debt_payments", userId] });
  queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
  queryClient.invalidateQueries({ queryKey: ["account_balances", userId] });
}

export function useDebtSummaries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["financial_debt_summaries", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<DebtSummary[]> => {
      const { data, error } = await supabase
        .from("financial_debt_summaries")
        .select("*")
        .eq("user_id", user!.id)
        .neq("status", "archived")
        .order("next_due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as DebtSummary[];
    },
  });
}

export function useDebtPayments(debtId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["debt_payments", user?.id, debtId],
    enabled: Boolean(user?.id && debtId),
    queryFn: async (): Promise<DebtPayment[]> => {
      const { data, error } = await supabase
        .from("debt_payments")
        .select("*")
        .eq("user_id", user!.id)
        .eq("debt_id", debtId)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DebtPayment[];
    },
  });
}

export function useCreateDebt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: DebtInput) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("financial_debts")
        .insert({ ...values, user_id: user.id, status: "active" })
        .select()
        .single();
      if (error) throw error;
      return data as Debt;
    },
    onSuccess: () => invalidateDebtData(queryClient, user?.id),
  });
}

export function useUpdateDebt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<DebtInput> }) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("financial_debts")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as Debt;
    },
    onSuccess: () => invalidateDebtData(queryClient, user?.id),
  });
}

export function useArchiveDebt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { error } = await supabase
        .from("financial_debts")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateDebtData(queryClient, user?.id),
  });
}

export function useCreateDebtPayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      debt_id: string;
      account_id: string;
      amount: number;
      payment_date: string;
      notes?: string | null;
      is_historical?: boolean;
    }) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase.rpc(values.is_historical ? "create_historical_debt_payment" : "create_debt_payment", {
        p_debt_id: values.debt_id,
        p_account_id: values.account_id,
        p_amount: values.amount,
        p_payment_date: values.payment_date,
        p_notes: values.notes ?? null,
      });
      if (error) throw error;
      return data as DebtPayment;
    },
    onSuccess: () => invalidateDebtData(queryClient, user?.id),
  });
}

export function useDeleteDebtPayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { error } = await supabase.rpc("delete_debt_payment", { p_payment_id: id });
      if (error) throw error;
    },
    onSuccess: () => invalidateDebtData(queryClient, user?.id),
  });
}
