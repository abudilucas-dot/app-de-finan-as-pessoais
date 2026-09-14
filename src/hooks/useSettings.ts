import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UserSettings = {
  id: string;
  user_id: string;
  currency: string;
  locale: string;
  timezone: string | null;
  theme: "light" | "dark" | "system";
  hide_values: boolean;
};

export function useSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user_settings", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<UserSettings | null> => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserSettings | null;
    },
  });
}

export function useUpdateSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: Partial<Omit<UserSettings, "id" | "user_id">>) => {
      const { data, error } = await supabase
        .from("user_settings")
        .update(values)
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data as UserSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["user_settings", user?.id], data);
    },
  });
}
