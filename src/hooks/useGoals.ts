import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type {
  FinancialGoal,
  GoalContribution,
  GoalContributionInput,
  GoalInput,
  GoalSummary,
} from "@/lib/goals";

function invalidateGoalData(queryClient: ReturnType<typeof useQueryClient>, userId?: string) {
  queryClient.invalidateQueries({ queryKey: ["financial_goal_summaries", userId] });
  queryClient.invalidateQueries({ queryKey: ["goal_contributions", userId] });
}

export function useGoalSummaries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["financial_goal_summaries", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<GoalSummary[]> => {
      const { data, error } = await supabase
        .from("financial_goal_summaries")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as GoalSummary[];
    },
  });
}

export function useGoalContributions(goalId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goal_contributions", user?.id, goalId],
    enabled: Boolean(user?.id && goalId),
    queryFn: async (): Promise<GoalContribution[]> => {
      const { data, error } = await supabase
        .from("goal_contributions")
        .select("*")
        .eq("goal_id", goalId)
        .order("contribution_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GoalContribution[];
    },
  });
}

export function useCreateGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: GoalInput) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("financial_goals")
        .insert({ ...values, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as FinancialGoal;
    },
    onSuccess: () => invalidateGoalData(queryClient, user?.id),
  });
}

export function useUpdateGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: GoalInput }) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("financial_goals")
        .update(values)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as FinancialGoal;
    },
    onSuccess: () => invalidateGoalData(queryClient, user?.id),
  });
}

export function useDeleteGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { error } = await supabase.from("financial_goals").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateGoalData(queryClient, user?.id),
  });
}

export function useCreateGoalContribution() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: GoalContributionInput) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("goal_contributions")
        .insert({ ...values, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as GoalContribution;
    },
    onSuccess: () => invalidateGoalData(queryClient, user?.id),
  });
}

export function useUpdateGoalContribution() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Omit<GoalContributionInput, "goal_id"> }) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("goal_contributions")
        .update(values)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as GoalContribution;
    },
    onSuccess: () => invalidateGoalData(queryClient, user?.id),
  });
}

export function useDeleteGoalContribution() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { error } = await supabase.from("goal_contributions").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateGoalData(queryClient, user?.id),
  });
}
