import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Budget, BudgetInput, BudgetSummary } from "@/lib/budgets";

function invalidateBudgetData(queryClient: ReturnType<typeof useQueryClient>, userId?: string) {
  queryClient.invalidateQueries({ queryKey: ["budgets", userId] });
  queryClient.invalidateQueries({ queryKey: ["budget_summaries", userId] });
}

export function useBudgetSummaries(periodStart: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["budget_summaries", user?.id, periodStart],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<BudgetSummary[]> => {
      const { data, error } = await supabase
        .from("budget_summaries")
        .select("*")
        .eq("user_id", user!.id)
        .eq("period_start", periodStart)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as BudgetSummary[];
    },
  });
}

export function useCreateBudget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: BudgetInput) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("budgets")
        .insert({ ...values, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Budget;
    },
    onSuccess: () => invalidateBudgetData(queryClient, user?.id),
  });
}

export function useUpdateBudget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount_limit }: { id: string; amount_limit: number }) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("budgets")
        .update({ amount_limit })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as Budget;
    },
    onSuccess: () => invalidateBudgetData(queryClient, user?.id),
  });
}

export function useDeleteBudget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateBudgetData(queryClient, user?.id),
  });
}
