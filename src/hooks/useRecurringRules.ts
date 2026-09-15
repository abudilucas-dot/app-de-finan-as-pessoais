import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { RecurringRule, RecurringRuleInput } from "@/lib/recurringRules";

function invalidateFinancialData(queryClient: ReturnType<typeof useQueryClient>, userId?: string) {
  queryClient.invalidateQueries({ queryKey: ["recurring-rules", userId] });
  queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
  queryClient.invalidateQueries({ queryKey: ["account_balances", userId] });
  queryClient.invalidateQueries({ queryKey: ["budget_summaries", userId] });
  queryClient.invalidateQueries({ queryKey: ["subscriptions", userId] });
}

export function useRecurringRules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recurring-rules", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<RecurringRule[]> => {
      const { data, error } = await supabase
        .from("recurring_rules")
        .select("*")
        .eq("active", true)
        .order("next_occurrence", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RecurringRule[];
    },
  });
}

export function useSubscriptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscriptions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<RecurringRule[]> => {
      const { data, error } = await supabase
        .from("recurring_rules")
        .select("*")
        .eq("is_subscription", true)
        .order("active", { ascending: false })
        .order("next_occurrence", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RecurringRule[];
    },
  });
}

export function useSetRecurringRuleActive() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("recurring_rules")
        .update({ active })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as RecurringRule;
    },
    onSuccess: () => invalidateFinancialData(queryClient, user?.id),
  });
}

export function useCreateRecurringRule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecurringRuleInput) => {
      const { data, error } = await supabase
        .from("recurring_rules")
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as RecurringRule;
    },
    onSuccess: () => invalidateFinancialData(queryClient, user?.id),
  });
}

export function useUpdateRecurringRule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: RecurringRuleInput }) => {
      const { data, error } = await supabase
        .from("recurring_rules")
        .update(values)
        .eq("id", id)
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data as RecurringRule;
    },
    onSuccess: () => invalidateFinancialData(queryClient, user?.id),
  });
}

export function useDeleteRecurringRule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_rules")
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateFinancialData(queryClient, user?.id),
  });
}

export function useCompleteRecurringRule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ruleId,
      expectedOccurrence,
      transactionDate,
    }: {
      ruleId: string;
      expectedOccurrence: string;
      transactionDate: string;
    }) => {
      const { data, error } = await supabase.rpc("complete_recurring_rule", {
        p_rule_id: ruleId,
        p_expected_occurrence: expectedOccurrence,
        p_transaction_date: transactionDate,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateFinancialData(queryClient, user?.id),
  });
}
