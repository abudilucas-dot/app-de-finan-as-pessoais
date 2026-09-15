import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { useBudgetSummaries } from "@/hooks/useBudgets";
import { useCategories } from "@/hooks/useCategories";
import { useCreditCardInvoices, useCreditCards } from "@/hooks/useCreditCards";
import { useGoalSummaries } from "@/hooks/useGoals";
import { useDebtSummaries } from "@/hooks/useDebts";
import { useRecurringRules } from "@/hooks/useRecurringRules";
import { useTransactions } from "@/hooks/useTransactions";
import { supabase } from "@/integrations/supabase/client";
import { budgetPercentage, periodStart } from "@/lib/budgets";
import { formatShortDate } from "@/lib/creditCards";
import { goalProgress } from "@/lib/goals";
import {
  dateInDays,
  type AppNotification,
  type NotificationDismissal,
} from "@/lib/notifications";
import { formatScheduledDate, todayDate } from "@/lib/recurringRules";

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const recurringRules = useRecurringRules();
  const invoices = useCreditCardInvoices();
  const creditCards = useCreditCards();
  const transactions = useTransactions();
  const budgets = useBudgetSummaries(periodStart());
  const goals = useGoalSummaries();
  const categories = useCategories("expense");
  const debts = useDebtSummaries();

  const dismissals = useQuery({
    queryKey: ["notification-dismissals", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<NotificationDismissal[]> => {
      const { data, error } = await supabase
        .from("notification_dismissals")
        .select("*")
        .eq("user_id", user!.id)
        .order("dismissed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const notifications = useMemo(() => {
    const today = todayDate();
    const nextWeek = dateInDays(7);
    const dismissed = new Set((dismissals.data ?? []).map((item) => item.notification_key));
    const items: AppNotification[] = [];

    for (const rule of recurringRules.data ?? []) {
      if (rule.next_occurrence > today) continue;
      const isOverdue = rule.next_occurrence < today;
      items.push({
        key: `scheduled:${rule.id}:${rule.next_occurrence}`,
        kind: "scheduled",
        priority: isOverdue ? "critical" : "warning",
        title: isOverdue ? "Lançamento em atraso" : "Lançamento programado para hoje",
        description: `${rule.description} — ${isOverdue ? `previsto para ${formatScheduledDate(rule.next_occurrence)}` : "registre quando concluir"}.`,
        to: "/calendario",
      });
    }

    const cardById = new Map((creditCards.data ?? []).map((card) => [card.id, card]));
    const invoiceBalances = new Map<string, number>();

    for (const transaction of transactions.data ?? []) {
      if (!transaction.invoice_id || transaction.status !== "confirmed") continue;
      if (transaction.type !== "expense" && transaction.type !== "card_payment") continue;
      const current = invoiceBalances.get(transaction.invoice_id) ?? 0;
      const value = Number(transaction.amount);
      invoiceBalances.set(
        transaction.invoice_id,
        current + (transaction.type === "expense" ? value : -value),
      );
    }

    for (const invoice of invoices.data ?? []) {
      const balance = invoiceBalances.get(invoice.id) ?? 0;
      if (invoice.status === "paid" || balance <= 0.005 || invoice.due_date > nextWeek) continue;
      const isOverdue = invoice.due_date < today || invoice.status === "overdue";
      const cardName = cardById.get(invoice.credit_card_id)?.name ?? "cartão";
      items.push({
        key: `invoice:${invoice.id}:${invoice.due_date}`,
        kind: "invoice",
        priority: isOverdue ? "critical" : "warning",
        title: isOverdue ? `Fatura de ${cardName} em atraso` : `Fatura de ${cardName} próxima do vencimento`,
        description: `Vencimento em ${formatShortDate(invoice.due_date)}.`,
        to: "/cartoes",
      });
    }

    for (const debt of debts.data ?? []) {
      if (debt.status !== "active" || !debt.next_due_date || debt.next_due_date > nextWeek) continue;
      const isOverdue = debt.next_due_date < today;
      items.push({
        key: `debt:${debt.id}:${debt.next_due_date}`,
        kind: "debt",
        priority: isOverdue ? "critical" : "warning",
        title: isOverdue ? `Dívida em atraso: ${debt.name}` : `Dívida próxima do vencimento: ${debt.name}`,
        description: `${isOverdue ? "Venceu" : "Vence"} em ${formatShortDate(debt.next_due_date)}.`,
        to: "/dividas",
      });
    }

    const categoryById = new Map((categories.data ?? []).map((category) => [category.id, category]));
    for (const budget of budgets.data ?? []) {
      const percentage = budgetPercentage(Number(budget.spent_amount), Number(budget.amount_limit));
      if (percentage < 80) continue;
      const exceeded = percentage >= 100;
      const categoryName = categoryById.get(budget.category_id)?.name ?? "categoria";
      items.push({
        key: `budget:${budget.id}:${budget.period_start}:${exceeded ? "exceeded" : "warning"}`,
        kind: "budget",
        priority: exceeded ? "critical" : "warning",
        title: exceeded ? `Orçamento de ${categoryName} ultrapassado` : `Orçamento de ${categoryName} quase no limite`,
        description: `Você já utilizou ${Math.round(percentage)}% do orçamento deste mês.`,
        to: "/orcamentos",
      });
    }

    for (const goal of goals.data ?? []) {
      if (goalProgress(Number(goal.current_amount), Number(goal.target_amount)) < 100) continue;
      items.push({
        key: `goal:${goal.id}:completed`,
        kind: "goal",
        priority: "success",
        title: `Meta concluída: ${goal.name}`,
        description: "Parabéns, sua meta atingiu o valor planejado.",
        to: "/metas",
      });
    }

    return items
      .filter((item) => !dismissed.has(item.key))
      .sort((a, b) => {
        const order = { critical: 0, warning: 1, success: 2 };
        return order[a.priority] - order[b.priority];
      });
  }, [
    budgets.data,
    categories.data,
    creditCards.data,
    debts.data,
    dismissals.data,
    goals.data,
    invoices.data,
    recurringRules.data,
    transactions.data,
  ]);

  const dismiss = useMutation({
    mutationFn: async (notificationKey: string) => {
      if (!user) throw new Error("Sessão não encontrada");
      const { error } = await supabase.from("notification_dismissals").upsert(
        { user_id: user.id, notification_key: notificationKey },
        { onConflict: "user_id,notification_key", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-dismissals", user?.id] }),
  });

  const dismissAll = useMutation({
    mutationFn: async (notificationKeys: string[]) => {
      if (!user || notificationKeys.length === 0) return;
      const { error } = await supabase.from("notification_dismissals").upsert(
        notificationKeys.map((notification_key) => ({ user_id: user.id, notification_key })),
        { onConflict: "user_id,notification_key", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-dismissals", user?.id] }),
  });

  return {
    notifications,
    isLoading:
      recurringRules.isLoading ||
      invoices.isLoading ||
      creditCards.isLoading ||
      transactions.isLoading ||
      budgets.isLoading ||
      goals.isLoading ||
      categories.isLoading ||
      debts.isLoading ||
      dismissals.isLoading,
    isError:
      recurringRules.isError ||
      invoices.isError ||
      creditCards.isError ||
      transactions.isError ||
      budgets.isError ||
      goals.isError ||
      categories.isError ||
      debts.isError ||
      dismissals.isError,
    refetch: async () => {
      await Promise.all([
        recurringRules.refetch(),
        invoices.refetch(),
        creditCards.refetch(),
        transactions.refetch(),
        budgets.refetch(),
        goals.refetch(),
        categories.refetch(),
        debts.refetch(),
        dismissals.refetch(),
      ]);
    },
    dismiss,
    dismissAll,
  };
}
