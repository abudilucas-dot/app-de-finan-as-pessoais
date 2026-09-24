import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type BillingSubscription = {
  user_id: string;
  provider: "internal" | "kiwify";
  plan_code: "pro_monthly" | "pro_annual" | null;
  status: "beta" | "trialing" | "active" | "past_due" | "cancelled" | "expired";
  trial_started_at: string;
  trial_ends_at: string;
  current_period_ends_at: string | null;
  cancel_at_period_end: boolean;
};

export function useBillingSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["billing-subscription", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<BillingSubscription | null> => {
      const { data, error } = await supabase
        .from("billing_subscriptions")
        .select("user_id, provider, plan_code, status, trial_started_at, trial_ends_at, current_period_ends_at, cancel_at_period_end")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      const subscription = data as BillingSubscription | null;

      if (
        subscription?.status === "trialing" &&
        new Date(subscription.trial_ends_at).getTime() <= Date.now()
      ) {
        return { ...subscription, status: "expired" };
      }

      return subscription;
    },
  });
}
