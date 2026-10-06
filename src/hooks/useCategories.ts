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

const categoryCollator = new Intl.Collator("pt-BR", { sensitivity: "base" });

/** Mantém a categoria genérica como última opção, independentemente da ordenação do banco. */
export function orderCategories(categories: Category[]) {
  return [...categories].sort((first, second) => {
    const firstIsOther = first.name.trim().toLocaleLowerCase("pt-BR") === "outros";
    const secondIsOther = second.name.trim().toLocaleLowerCase("pt-BR") === "outros";
    if (firstIsOther !== secondIsOther) return firstIsOther ? 1 : -1;
    return categoryCollator.compare(first.name, second.name);
  });
}

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
      return orderCategories((data ?? []) as Category[]);
    },
  });
}
