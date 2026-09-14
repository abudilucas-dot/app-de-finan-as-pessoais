import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type AccountBalance = {
  account_id: string;
  user_id: string;
  current_balance: number;
};

export function useAccountBalances() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["account_balances", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<AccountBalance[]> => {
      const { data, error } = await supabase.from("account_balances").select("*");
      if (error) throw error;
      return (data ?? []).filter(
        (row): row is AccountBalance =>
          Boolean(row.account_id && row.user_id) && row.current_balance !== null,
      );
    },
  });
}

export function toBalanceMap(balances: AccountBalance[] | undefined) {
  return new Map(
    (balances ?? []).map((balance) => [balance.account_id, Number(balance.current_balance)]),
  );
}
