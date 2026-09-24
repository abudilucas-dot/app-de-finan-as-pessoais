import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowLeftRight,
  CreditCard,
  Landmark,
  Loader2,
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/states";
import { PageHeader } from "@/components/app/PageHeader";
import { moduleThemes } from "@/config/moduleThemes";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/useCategories";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useDebitCards } from "@/hooks/useDebitCards";
import { useRestoreTransaction, useTrashedTransactions } from "@/hooks/useTransactions";
import { type FinancialTransaction, formatTransactionDate, TRANSACTION_TYPE_LABELS } from "@/lib/transactions";

export const Route = createFileRoute("/_app/lixeira")({
  component: TrashPage,
});

type TrashItem = {
  id: string;
  transactions: FinancialTransaction[];
  title: string;
  subtitle: string;
  amount: number;
  icon: typeof TrendingUp;
  deletedAt: string | null;
};

function retentionLabel(deletedAt: string | null) {
  if (!deletedAt) return "Disponível para restaurar por até 30 dias.";
  const remainingHours = Math.max(0, Math.ceil((new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000)));
  if (remainingHours <= 1) return "Expira em menos de 1 hora.";
  if (remainingHours <= 24) return `Expira em ${remainingHours} horas.`;
  const remainingDays = Math.ceil(remainingHours / 24);
  return `Restam ${remainingDays} ${remainingDays === 1 ? "dia" : "dias"} para restaurar.`;
}

function TrashPage() {
  const transactions = useTrashedTransactions();
  const restore = useRestoreTransaction();
  const categories = useCategories();
  const cards = useCreditCards();
  const debitCards = useDebitCards();

  const items = useMemo<TrashItem[]>(() => {
    const categoryById = new Map((categories.data ?? []).map((category) => [category.id, category.name]));
    const cardById = new Map((cards.data ?? []).map((card) => [card.id, card.name]));
    const debitCardById = new Map((debitCards.data ?? []).map((card) => [card.id, card.name]));
    const grouped = new Set<string>();
    const result: TrashItem[] = [];

    for (const transaction of transactions.data ?? []) {
      const groupKey =
        transaction.type === "expense" && transaction.credit_card_id && transaction.installment_group_id
          ? transaction.installment_group_id
          : transaction.id;
      if (grouped.has(groupKey)) continue;
      grouped.add(groupKey);

      const groupedTransactions =
        groupKey === transaction.id
          ? [transaction]
          : (transactions.data ?? []).filter((item) => item.installment_group_id === groupKey);
      const first = groupedTransactions[0] ?? transaction;
      const totalAmount = groupedTransactions.reduce((total, item) => total + Number(item.amount), 0);
      const category = first.category_id ? categoryById.get(first.category_id) : undefined;
      const card = first.credit_card_id ? cardById.get(first.credit_card_id) : undefined;
      const debitCard = first.debit_card_id ? debitCardById.get(first.debit_card_id) : undefined;
      const installments = groupedTransactions.length > 1 ? ` · ${groupedTransactions.length} parcelas` : "";
      const source = card ?? debitCard ?? category ?? TRANSACTION_TYPE_LABELS[first.type];
      const deletedAt = groupedTransactions
        .map((item) => item.deleted_at)
        .filter((date): date is string => Boolean(date))
        .sort()[0] ?? null;

      result.push({
        id: first.id,
        transactions: groupedTransactions,
        title: first.description.replace(/ \(1\/\d+\)$/, ""),
        subtitle: `${source} · ${formatTransactionDate(first.transaction_date)}${installments}`,
        amount: totalAmount,
        deletedAt,
        icon:
          first.type === "income"
            ? TrendingUp
            : first.type === "transfer"
              ? ArrowLeftRight
              : first.type === "card_payment"
                ? CreditCard
                : first.debit_card_id
                  ? Landmark
                  : TrendingDown,
      });
    }

    return result;
  }, [cards.data, categories.data, debitCards.data, transactions.data]);

  const theme = moduleThemes.trash;

  const restoreItem = async (item: TrashItem) => {
    try {
      const count = await restore.mutateAsync(item.id);
      toast.success(count > 1 ? `${count} parcelas foram restauradas.` : "Movimentação restaurada.");
    } catch {
      toast.error("Não foi possível restaurar esta movimentação.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lixeira"
        description="As movimentações ficam disponíveis para restauração por até 30 dias antes da exclusão definitiva."
      />

      <section className={`surface flex items-start gap-3 border p-4 ${theme.card}`}>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.icon}`}>
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className={`font-semibold ${theme.text}`}>Recuperação por 30 dias</h2>
          <p className="mt-1 text-sm text-muted-foreground">Você pode restaurar uma movimentação dentro desse período antes que ela seja apagada definitivamente.</p>
        </div>
      </section>

      {transactions.isLoading || categories.isLoading || cards.isLoading || debitCards.isLoading ? (
        <LoadingState label="Carregando a lixeira..." />
      ) : null}

      {transactions.isError ? (
        <ErrorState
          title="Não foi possível carregar a lixeira"
          description="Tente novamente em alguns instantes."
          onRetry={() => void transactions.refetch()}
        />
      ) : null}

      {!transactions.isLoading && !transactions.isError && items.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Sua lixeira está vazia"
          description="Quando você excluir uma movimentação, ela poderá ser restaurada por até 30 dias."
        />
      ) : null}

      {!transactions.isLoading && !transactions.isError && items.length > 0 ? (
        <div className={`surface divide-y overflow-hidden border ${theme.card}`}>
          {items.map((item) => {
            const Icon = item.icon;
            const restoring = restore.isPending && restore.variables === item.id;
            return (
              <article key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-400/15 text-slate-700 dark:text-slate-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{item.title}</h2>
                    <p className="truncate text-sm text-muted-foreground">{item.subtitle}</p>
                    <p className="mt-1 text-xs text-warning">{retentionLabel(item.deletedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <MoneyDisplay value={item.amount} className="font-semibold" />
                  <Button className="border-slate-400/50 text-slate-700 hover:bg-slate-400/15 dark:text-slate-200" size="sm" variant="outline" onClick={() => void restoreItem(item)} disabled={restoring}>
                    {restoring ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
                    Restaurar
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
