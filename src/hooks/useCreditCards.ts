import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type {
  CreditCard,
  CreditCardInput,
  CreditCardInvoice,
  CreditCardSummary,
} from "@/lib/creditCards";
import type { FinancialTransaction } from "@/lib/transactions";

function invalidateCardFinancialData(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string,
) {
  queryClient.invalidateQueries({ queryKey: ["credit_cards", userId] });
  queryClient.invalidateQueries({ queryKey: ["credit_card_summaries", userId] });
  queryClient.invalidateQueries({ queryKey: ["credit_card_invoices", userId] });
  queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
  queryClient.invalidateQueries({ queryKey: ["account_balances", userId] });
  queryClient.invalidateQueries({ queryKey: ["budget_summaries", userId] });
}

export function useCreditCards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credit_cards", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<CreditCard[]> => {
      const { data, error } = await supabase.from("credit_cards").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as CreditCard[];
    },
  });
}

export function useCreditCardSummaries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credit_card_summaries", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<CreditCardSummary[]> => {
      const { data, error } = await supabase.from("credit_card_summaries").select("*");
      if (error) throw error;
      return (data ?? []).filter(
        (
          summary,
        ): summary is NonNullable<typeof summary> & { credit_card_id: string; user_id: string } =>
          Boolean(summary.credit_card_id && summary.user_id),
      ) as CreditCardSummary[];
    },
  });
}

export function useCreditCardInvoices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credit_card_invoices", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<CreditCardInvoice[]> => {
      const { data, error } = await supabase
        .from("credit_card_invoices")
        .select("*")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CreditCardInvoice[];
    },
  });
}

export function useCreateCreditCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: CreditCardInput) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("credit_cards")
        .insert({ ...values, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as CreditCard;
    },
    onSuccess: () => invalidateCardFinancialData(queryClient, user?.id),
  });
}

export function useUpdateCreditCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: Partial<CreditCardInput> & { id: string; is_archived?: boolean }) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { data, error } = await supabase
        .from("credit_cards")
        .update(values)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as CreditCard;
    },
    onSuccess: () => invalidateCardFinancialData(queryClient, user?.id),
  });
}

export function useCreateCardExpense() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      creditCardId: string;
      description: string;
      amount: number;
      categoryId: string;
      transactionDate: string;
      totalInstallments: number;
      notes?: string | null;
    }) => {
      const notes = values.notes?.trim();
      const { data, error } = await supabase.rpc("create_card_installment_expense", {
        p_credit_card_id: values.creditCardId,
        p_description: values.description,
        p_amount: values.amount,
        p_category_id: values.categoryId,
        p_transaction_date: values.transactionDate,
        p_total_installments: values.totalInstallments,
        ...(notes ? { p_notes: notes } : {}),
      });
      if (error) throw error;
      return data as FinancialTransaction[];
    },
    onSuccess: () => invalidateCardFinancialData(queryClient, user?.id),
  });
}

export function useDeleteCreditCardPurchase() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase.rpc("delete_credit_card_purchase", {
        p_transaction_id: transactionId,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateCardFinancialData(queryClient, user?.id),
  });
}

export function useReplaceCreditCardPurchase() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      transactionId: string;
      creditCardId: string;
      description: string;
      amount: number;
      categoryId: string;
      transactionDate: string;
      totalInstallments: number;
      notes?: string | null;
    }) => {
      const notes = values.notes?.trim();
      const { data, error } = await supabase.rpc("replace_credit_card_purchase", {
        p_transaction_id: values.transactionId,
        p_credit_card_id: values.creditCardId,
        p_description: values.description,
        p_amount: values.amount,
        p_category_id: values.categoryId,
        p_transaction_date: values.transactionDate,
        p_total_installments: values.totalInstallments,
        ...(notes ? { p_notes: notes } : {}),
      });
      if (error) throw error;
      return data as FinancialTransaction[];
    },
    onSuccess: () => invalidateCardFinancialData(queryClient, user?.id),
  });
}

export function usePayCreditCardInvoice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: { invoiceId: string; accountId: string; paymentDate: string }) => {
      const { data, error } = await supabase.rpc("pay_credit_card_invoice", {
        p_invoice_id: values.invoiceId,
        p_account_id: values.accountId,
        p_payment_date: values.paymentDate,
      });
      if (error) throw error;
      return data as FinancialTransaction;
    },
    onSuccess: () => invalidateCardFinancialData(queryClient, user?.id),
  });
}
