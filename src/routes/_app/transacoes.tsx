import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { PageHeader } from "@/components/app/PageHeader";
import { CardExpenseDialog, type CardPurchaseDraft } from "@/components/app/CardExpenseDialog";
import { TransactionFormDialog } from "@/components/app/TransactionFormDialog";
import { TransactionItem } from "@/components/app/TransactionItem";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/states";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useCreditCards, useDeleteCreditCardPurchase } from "@/hooks/useCreditCards";
import { useDebitCards } from "@/hooks/useDebitCards";
import { useDeleteTransaction, useTransactions } from "@/hooks/useTransactions";
import { consumeNewTransactionRequest, newTransactionEventName } from "@/lib/newTransaction";
import {
  type FinancialTransaction,
  type TransactionType,
  TRANSACTION_TYPE_LABELS,
  calculateMonthlySummary,
} from "@/lib/transactions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/transacoes")({
  head: () => ({ meta: [{ title: `Transações — ${brand.name}` }] }),
  component: TransactionsPage,
});

const FILTERS: { value: "all" | TransactionType; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "income", label: "Receitas" },
  { value: "expense", label: "Despesas" },
  { value: "transfer", label: "Transferências" },
];

function toCardPurchaseDraft(
  transaction: FinancialTransaction,
  allTransactions: FinancialTransaction[],
): CardPurchaseDraft | null {
  if (!transaction.credit_card_id || !transaction.category_id) return null;
  const purchases = transaction.installment_group_id
    ? allTransactions.filter(
        (item) => item.installment_group_id === transaction.installment_group_id,
      )
    : [transaction];
  const firstPurchase = purchases.find((item) => item.installment_number === 1) ?? transaction;

  return {
    transactionId: transaction.id,
    creditCardId: transaction.credit_card_id,
    description: firstPurchase.description.replace(/ \(\d+\/\d+\)$/, ""),
    amount: purchases.reduce((total, item) => total + Number(item.amount), 0),
    categoryId: transaction.category_id,
    transactionDate: firstPurchase.transaction_date,
    totalInstallments: transaction.total_installments ?? 1,
    notes: firstPurchase.notes,
  };
}

function TransactionsPage() {
  const transactions = useTransactions();
  const accounts = useAccounts();
  const categories = useCategories();
  const cards = useCreditCards();
  const debitCards = useDebitCards();
  const deleteTransaction = useDeleteTransaction();
  const deleteCreditCardPurchase = useDeleteCreditCardPurchase();
  const [filter, setFilter] = useState<"all" | TransactionType>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinancialTransaction | null>(null);
  const [cardPurchaseTarget, setCardPurchaseTarget] = useState<FinancialTransaction | null>(null);
  const [editingCardPurchase, setEditingCardPurchase] = useState<CardPurchaseDraft | null>(null);

  useEffect(() => {
    const openRequestedTransaction = () => {
      setEditing(null);
      setFormOpen(true);
    };

    if (consumeNewTransactionRequest()) openRequestedTransaction();
    window.addEventListener(newTransactionEventName, openRequestedTransaction);
    return () => window.removeEventListener(newTransactionEventName, openRequestedTransaction);
  }, []);

  const accountMap = useMemo(
    () => new Map((accounts.data ?? []).map((account) => [account.id, account.name])),
    [accounts.data],
  );
  const categoryMap = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category.name])),
    [categories.data],
  );
  const cardMap = useMemo(
    () => new Map((cards.data ?? []).map((card) => [card.id, card.name])),
    [cards.data],
  );
  const debitCardMap = useMemo(
    () => new Map((debitCards.data ?? []).map((card) => [card.id, card.name])),
    [debitCards.data],
  );

  if (
    transactions.isLoading ||
    accounts.isLoading ||
    categories.isLoading ||
    cards.isLoading ||
    debitCards.isLoading
  ) {
    return <LoadingState label="Carregando suas movimentações..." />;
  }
  if (
    transactions.isError ||
    accounts.isError ||
    categories.isError ||
    cards.isError ||
    debitCards.isError
  ) {
    return (
      <ErrorState
        onRetry={() => {
          transactions.refetch();
          accounts.refetch();
          categories.refetch();
          cards.refetch();
          debitCards.refetch();
        }}
      />
    );
  }

  const transactionList = transactions.data ?? [];
  const filteredTransactions = transactionList.filter(
    (transaction) => filter === "all" || transaction.type === filter,
  );
  const summary = calculateMonthlySummary(transactionList);
  const activeAccounts = (accounts.data ?? []).filter((account) => !account.is_archived);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (transaction: FinancialTransaction) => {
    setEditing(transaction);
    setFormOpen(true);
  };

  const openEditCardPurchase = (transaction: FinancialTransaction) => {
    const purchase = toCardPurchaseDraft(transaction, transactionList);
    if (purchase) setEditingCardPurchase(purchase);
  };

  const removeTransaction = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTransaction.mutateAsync(deleteTarget.id);
      toast.success("Movimentação excluída.");
      setDeleteTarget(null);
    } catch {
      toast.error("Não foi possível excluir a movimentação.");
    }
  };

  const cancelCardPurchase = async () => {
    if (!cardPurchaseTarget) return;
    try {
      await deleteCreditCardPurchase.mutateAsync(cardPurchaseTarget.id);
      toast.success(
        (cardPurchaseTarget.total_installments ?? 1) > 1
          ? "Compra parcelada cancelada. Todas as parcelas foram removidas."
          : "Compra no cartão cancelada.",
      );
      setCardPurchaseTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message.includes("has been paid")
          ? "Não é possível cancelar: uma das faturas desta compra já foi paga."
          : "Não foi possível cancelar a compra no cartão.",
      );
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Transações"
        description="Registre e acompanhe todas as suas movimentações."
        actions={
          <Button onClick={openCreate} disabled={activeAccounts.length === 0}>
            <Plus aria-hidden="true" />
            Nova movimentação
          </Button>
        }
      />

      <section aria-label="Resumo do mês" className="grid gap-4 sm:grid-cols-3">
        <article className="surface p-5">
          <p className="text-sm text-muted-foreground">Receitas do mês</p>
          <MoneyDisplay
            value={summary.income}
            className="mt-2 block text-xl font-semibold text-positive"
          />
        </article>
        <article className="surface p-5">
          <p className="text-sm text-muted-foreground">Despesas do mês</p>
          <MoneyDisplay
            value={summary.expense}
            className="mt-2 block text-xl font-semibold text-negative"
          />
        </article>
        <article className="surface p-5">
          <p className="text-sm text-muted-foreground">Resultado do mês</p>
          <MoneyDisplay
            value={summary.result}
            signed
            className="mt-2 block text-xl font-semibold"
          />
        </article>
      </section>

      {activeAccounts.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Cadastre uma conta primeiro"
          description="Uma movimentação precisa estar ligada a uma conta. Vá até Contas para criar a primeira."
        />
      ) : (
        <section className="surface p-4 sm:p-6">
          <div
            className="mb-3 flex gap-2 overflow-x-auto pb-2"
            role="tablist"
            aria-label="Filtrar transações"
          >
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={cn(
                  "min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors",
                  filter === item.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {filteredTransactions.length ? (
            <div>
              {filteredTransactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  accountName={
                    transaction.account_id ? accountMap.get(transaction.account_id) : undefined
                  }
                  destinationAccountName={
                    transaction.destination_account_id
                      ? accountMap.get(transaction.destination_account_id)
                      : undefined
                  }
                  categoryName={
                    transaction.category_id ? categoryMap.get(transaction.category_id) : undefined
                  }
                  cardName={
                    transaction.credit_card_id ? cardMap.get(transaction.credit_card_id) : undefined
                  }
                  debitCardName={
                    transaction.debit_card_id
                      ? debitCardMap.get(transaction.debit_card_id)
                      : undefined
                  }
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onCancelCardPurchase={setCardPurchaseTarget}
                  onEditCardPurchase={openEditCardPurchase}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ArrowLeftRight}
              title={
                filter === "all"
                  ? "Nenhuma movimentação"
                  : `Nenhuma ${TRANSACTION_TYPE_LABELS[filter].toLowerCase()}`
              }
              description="Adicione uma movimentação para começar a acompanhar seus números."
              action={<Button onClick={openCreate}>Adicionar movimentação</Button>}
              className="border-0 shadow-none"
            />
          )}
        </section>
      )}

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        accounts={accounts.data ?? []}
      />

      <CardExpenseDialog
        open={Boolean(editingCardPurchase)}
        onOpenChange={(open) => !open && setEditingCardPurchase(null)}
        cards={cards.data ?? []}
        purchase={editingCardPurchase}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta movimentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação recalculará o saldo das contas e não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTransaction.isPending}
              onClick={removeTransaction}
            >
              {deleteTransaction.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(cardPurchaseTarget)}
        onOpenChange={(open) => !open && setCardPurchaseTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta compra no cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              {(cardPurchaseTarget?.total_installments ?? 1) > 1
                ? `Todas as ${cardPurchaseTarget?.total_installments} parcelas serão removidas, e o limite será recalculado.`
                : "A compra será removida, e o limite será recalculado."}
              {" Esta ação não poderá ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCreditCardPurchase.isPending}
              onClick={cancelCardPurchase}
            >
              {deleteCreditCardPurchase.isPending ? "Cancelando..." : "Cancelar compra"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
