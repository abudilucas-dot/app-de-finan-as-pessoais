import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  color: string | null;
  is_default: boolean;
};

export function useCategories(type?: "income" | "expense") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["categories", user?.id, type ?? "all"],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Category[]> => {
      let query = supabase.from("categories").select("*").order("name");
      if (type) query = query.eq("type", type);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}
