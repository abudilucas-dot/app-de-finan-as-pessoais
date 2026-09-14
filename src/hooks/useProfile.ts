import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  monthly_income: number | null;
  payday: number | null;
  financial_objective: string | null;
  onboarding_completed: boolean;
};

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: Partial<Omit<Profile, "id" | "user_id">>) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(values)
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["profile", user?.id], data);
    },
  });
}
