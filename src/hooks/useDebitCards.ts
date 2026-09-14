import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { DebitCard, DebitCardInput } from "@/lib/debitCards";

function invalidateDebitCardData(queryClient: ReturnType<typeof useQueryClient>, userId?: string) {
  queryClient.invalidateQueries({ queryKey: ["debit_cards", userId] });
  queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
}

export function useDebitCards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["debit_cards", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<DebitCard[]> => {
      const { data, error } = await supabase
        .from("debit_cards")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as DebitCard[];
    },
  });
}

export function useCreateDebitCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: DebitCardInput) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("debit_cards")
        .insert({ ...values, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as DebitCard;
    },
    onSuccess: () => invalidateDebitCardData(queryClient, user?.id),
  });
}

export function useUpdateDebitCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: Partial<DebitCardInput> & { id: string; is_archived?: boolean }) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("debit_cards")
        .update(values)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as DebitCard;
    },
    onSuccess: () => invalidateDebitCardData(queryClient, user?.id),
  });
}
