import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { FinancialTransaction, TransactionInput } from "@/lib/transactions";

export function useTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["transactions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<FinancialTransaction[]> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .is("deleted_at", null)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FinancialTransaction[];
    },
  });
}

function invalidateFinancialData(queryClient: ReturnType<typeof useQueryClient>, userId?: string) {
  queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
  queryClient.invalidateQueries({ queryKey: ["trashed_transactions", userId] });
  queryClient.invalidateQueries({ queryKey: ["account_balances", userId] });
  queryClient.invalidateQueries({ queryKey: ["budget_summaries", userId] });
}

export function useTrashedTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trashed_transactions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<FinancialTransaction[]> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .not("deleted_at", "is", null)
        .eq("deletion_reason", "user_deleted")
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FinancialTransaction[];
    },
  });
}

export function useCreateTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as FinancialTransaction;
    },
    onSuccess: () => invalidateFinancialData(queryClient, user?.id),
  });
}

export function useUpdateTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<TransactionInput> }) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("transactions")
        .update(values)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as FinancialTransaction;
    },
    onSuccess: () => invalidateFinancialData(queryClient, user?.id),
  });
}

export function useDeleteTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { error } = await supabase.rpc("trash_transaction", {
        p_transaction_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateFinancialData(queryClient, user?.id),
  });
}


export function useRestoreTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase.rpc("restore_transaction", {
        p_transaction_id: id,
      });
      if (error) throw error;
      return Number(data);
    },
    onSuccess: () => invalidateFinancialData(queryClient, user?.id),
  });
}
