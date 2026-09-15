import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AccountType } from "@/lib/accounts";

export type Account = {
  id: string;
  user_id: string;
  name: string;
  institution: string | null;
  type: AccountType;
  initial_balance: number;
  icon: string | null;
  color: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type AccountInput = {
  name: string;
  institution?: string | null;
  type: AccountType;
  initial_balance: number;
  color?: string | null;
};

export function useAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["accounts", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });
}

export function useCreateAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AccountInput) => {
      const { data, error } = await supabase
        .from("accounts")
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["account_balances", user?.id] });
    },
  });
}

export function useUpdateAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Account> & { id: string }) => {
      const { data, error } = await supabase
        .from("accounts")
        .update(values)
        .eq("id", id)
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data as Account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", user?.id] });
    },
  });
}
