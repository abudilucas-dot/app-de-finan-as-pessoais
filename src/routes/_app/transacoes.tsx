import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { InstallmentPurchaseItem } from "@/components/app/InstallmentPurchaseItem";
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
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brand } from "@/config/brand";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import {
  useCreditCardInvoices,
  useCreditCards,
  useDeleteCreditCardPayment,
  useDeleteCreditCardPurchase,
} from "@/hooks/useCreditCards";
import { useDebitCards } from "@/hooks/useDebitCards";
import { useDeleteTransaction, useTransactions } from "@/hooks/useTransactions";
import { consumeNewTransactionRequest, newTransactionEventName } from "@/lib/newTransaction";
import {
  type FinancialTransaction,
  type TransactionStatus,
  type TransactionType,
  TRANSACTION_STATUS_LABELS,
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
  { value: "card_payment", label: "Faturas" },
];

const STATUS_FILTERS: { value: "all" | TransactionStatus; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "pending", label: "Pendentes" },
  { value: "overdue", label: "Atrasadas" },
  { value: "cancelled", label: "Canceladas" },
];

type SourceFilter = "all" | `account:${string}` | `credit:${string}` | `debit:${string}`;

const TRANSACTIONS_VIEW_KEY = "valune:transactions-view";
const TRANSACTIONS_VIEW_WINDOW_MS = 20 * 60 * 1000;

type SavedTransactionsView = {
  filter: "all" | TransactionType;
  statusFilter: "all" | TransactionStatus;
  categoryFilter: string;
  sourceFilter: SourceFilter;
  query: string;
  startDate: string;
  endDate: string;
  savedAt: number;
};

function readSavedTransactionsView(): SavedTransactionsView | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(TRANSACTIONS_VIEW_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedTransactionsView;
    if (Date.now() - saved.savedAt > TRANSACTIONS_VIEW_WINDOW_MS) {
      window.localStorage.removeItem(TRANSACTIONS_VIEW_KEY);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthStart() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
}

function calculateFilteredResult(transactions: FinancialTransaction[]) {
  return transactions.reduce(
    (total, transaction) => {
      if (transaction.status !== "confirmed") return total;
      if (transaction.type === "income") total.income += Number(transaction.amount);
      if (transaction.type === "expense") total.expense += Number(transaction.amount);
      return total;
    },
    { income: 0, expense: 0 },
  );
}

type TransactionDisplayItem =
  | { kind: "transaction"; transaction: FinancialTransaction }
  | { kind: "installment_purchase"; installments: FinancialTransaction[] };

function displayTransactions(
  filteredTransactions: FinancialTransaction[],
  allTransactions: FinancialTransaction[],
): TransactionDisplayItem[] {
  const displayedGroups = new Set<string>();

  return filteredTransactions.flatMap((transaction) => {
    const groupId = transaction.installment_group_id;
    const isInstallmentPurchase = Boolean(groupId && (transaction.total_installments ?? 1) > 1);
    if (!isInstallmentPurchase || !groupId) {
      return [{ kind: "transaction" as const, transaction }];
    }
    if (displayedGroups.has(groupId)) return [];
    displayedGroups.add(groupId);

    const installments = allTransactions.filter((item) => item.installment_group_id === groupId);
    return installments.length > 1
      ? [{ kind: "installment_purchase" as const, installments }]
      : [{ kind: "transaction" as const, transaction }];
  });
}

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
  const invoices = useCreditCardInvoices();
  const debitCards = useDebitCards();
  const deleteTransaction = useDeleteTransaction();
  const deleteCreditCardPurchase = useDeleteCreditCardPurchase();
  const deleteCreditCardPayment = useDeleteCreditCardPayment();
  const [savedView] = useState(readSavedTransactionsView);
  const [filter, setFilter] = useState<"all" | TransactionType>(() => savedView?.filter ?? "all");
  const [statusFilter, setStatusFilter] = useState<"all" | TransactionStatus>(() => savedView?.statusFilter ?? "all");
  const [categoryFilter, setCategoryFilter] = useState(() => savedView?.categoryFilter ?? "all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(() => savedView?.sourceFilter ?? "all");
  const [query, setQuery] = useState(() => savedView?.query ?? "");
  const [startDate, setStartDate] = useState(() => savedView?.startDate ?? "");
  const [endDate, setEndDate] = useState(() => savedView?.endDate ?? "");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinancialTransaction | null>(null);
  const [cardPurchaseTarget, setCardPurchaseTarget] = useState<FinancialTransaction | null>(null);
  const [cardPaymentTarget, setCardPaymentTarget] = useState<FinancialTransaction | null>(null);
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

  useEffect(() => {
    try {
      window.localStorage.setItem(
        TRANSACTIONS_VIEW_KEY,
        JSON.stringify({
          filter,
          statusFilter,
          categoryFilter,
          sourceFilter,
          query,
          startDate,
          endDate,
          savedAt: Date.now(),
        } satisfies SavedTransactionsView),
      );
    } catch {
      // Filtros continuam funcionando normalmente se o navegador bloquear armazenamento.
    }
  }, [categoryFilter, endDate, filter, query, sourceFilter, startDate, statusFilter]);

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
  const invoiceMap = useMemo(
    () => new Map((invoices.data ?? []).map((invoice) => [invoice.id, invoice])),
    [invoices.data],
  );

  if (
    transactions.isLoading ||
    accounts.isLoading ||
    categories.isLoading ||
    cards.isLoading ||
    invoices.isLoading ||
    debitCards.isLoading
  ) {
    return <LoadingState label="Carregando suas movimentações..." />;
  }
  if (
    transactions.isError ||
    accounts.isError ||
    categories.isError ||
    cards.isError ||
    invoices.isError ||
    debitCards.isError
  ) {
    return (
      <ErrorState
        onRetry={() => {
          transactions.refetch();
          accounts.refetch();
          categories.refetch();
          cards.refetch();
          invoices.refetch();
          debitCards.refetch();
        }}
      />
    );
  }

  const transactionList = transactions.data ?? [];
  const filteredTransactions = transactionList.filter((transaction) => {
    if (filter !== "all" && transaction.type !== filter) return false;
    if (statusFilter !== "all" && transaction.status !== statusFilter) return false;
    if (categoryFilter !== "all" && transaction.category_id !== categoryFilter) return false;
    if (startDate && transaction.transaction_date < startDate) return false;
    if (endDate && transaction.transaction_date > endDate) return false;

    if (sourceFilter !== "all") {
      const [sourceType, sourceId] = sourceFilter.split(":");
      const matchesSource =
        (sourceType === "account" &&
          (transaction.account_id === sourceId ||
            transaction.destination_account_id === sourceId)) ||
        (sourceType === "credit" && transaction.credit_card_id === sourceId) ||
        (sourceType === "debit" && transaction.debit_card_id === sourceId);
      if (!matchesSource) return false;
    }

    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedQuery) return true;
    const searchableText = [
      transaction.description,
      transaction.notes,
      transaction.category_id ? categoryMap.get(transaction.category_id) : undefined,
      transaction.account_id ? accountMap.get(transaction.account_id) : undefined,
      transaction.destination_account_id
        ? accountMap.get(transaction.destination_account_id)
        : undefined,
      transaction.credit_card_id ? cardMap.get(transaction.credit_card_id) : undefined,
      transaction.debit_card_id ? debitCardMap.get(transaction.debit_card_id) : undefined,
      TRANSACTION_TYPE_LABELS[transaction.type],
      TRANSACTION_STATUS_LABELS[transaction.status],
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("pt-BR");

    return searchableText.includes(normalizedQuery);
  });
  const renderedTransactions = displayTransactions(filteredTransactions, transactionList);
  const summary = calculateMonthlySummary(transactionList);
  const filteredSummary = calculateFilteredResult(filteredTransactions);
  const activeAccounts = (accounts.data ?? []).filter((account) => !account.is_archived);
  const hasActiveFilters = Boolean(
    filter !== "all" ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    sourceFilter !== "all" ||
    query.trim() ||
    startDate ||
    endDate,
  );

  const clearFilters = () => {
    setFilter("all");
    setStatusFilter("all");
    setCategoryFilter("all");
    setSourceFilter("all");
    setQuery("");
    setStartDate("");
    setEndDate("");
  };

  const setCurrentMonth = () => {
    setStartDate(currentMonthStart());
    setEndDate(formatLocalDate(new Date()));
  };

  const setLastThirtyDays = () => {
    const start = new Date();
    start.setDate(start.getDate() - 29);
    setStartDate(formatLocalDate(start));
    setEndDate(formatLocalDate(new Date()));
  };

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

  const undoCardPayment = async () => {
    if (!cardPaymentTarget) return;
    try {
      await deleteCreditCardPayment.mutateAsync(cardPaymentTarget.id);
      toast.success("Pagamento desfeito. A fatura voltou a ficar em aberto.");
      setCardPaymentTarget(null);
    } catch {
      toast.error("Não foi possível desfazer o pagamento da fatura.");
    }
  };

  const cancelCardPurchase = async () => {
    if (!cardPurchaseTarget) return;
    try {
      const cancelledInstallments = await deleteCreditCardPurchase.mutateAsync(
        cardPurchaseTarget.id,
      );
      if (cancelledInstallments === 0) {
        toast("Nenhuma parcela foi removida porque esta compra já está totalmente paga.");
      } else if ((cardPurchaseTarget.total_installments ?? 1) > cancelledInstallments) {
        toast.success(
          `${cancelledInstallments} parcela(s) em aberto foram canceladas. Para remover também as já pagas, desfaça antes o pagamento da fatura.`,
        );
      } else {
        toast.success(
          cancelledInstallments > 1
            ? "Compra parcelada cancelada. Todas as parcelas foram removidas."
            : "Compra no cartão cancelada.",
        );
      }
      setCardPurchaseTarget(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error && "message" in error
            ? String(error.message)
            : "";
      toast.error(
        message.includes("Credit card purchase not found")
          ? "Esta compra não está mais disponível para cancelamento."
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
          <div className="mb-5 space-y-4 border-b pb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
                Filtrar movimentações
              </div>
              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X aria-hidden="true" />
                  Limpar filtros
                </Button>
              ) : null}
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por descrição, categoria, conta ou cartão"
                aria-label="Buscar movimentações"
                className="min-h-11 pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Período rápido">
              <Button variant="outline" size="sm" onClick={setCurrentMonth}>
                Este mês
              </Button>
              <Button variant="outline" size="sm" onClick={setLastThirtyDays}>
                Últimos 30 dias
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Todo o período
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="min-w-0 space-y-1.5 text-sm font-medium">
                <span>De</span>
                <DateInput
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="min-h-11"
                />
              </label>
              <label className="min-w-0 space-y-1.5 text-sm font-medium">
                <span>Até</span>
                <DateInput
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="min-h-11"
                />
              </label>
              <label className="min-w-0 space-y-1.5 text-sm font-medium">
                <span>Categoria</span>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="min-h-11">
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {(categories.data ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="min-w-0 space-y-1.5 text-sm font-medium">
                <span>Status</span>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as "all" | TransactionStatus)}
                >
                  <SelectTrigger className="min-h-11">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTERS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>

            <label className="block space-y-1.5 text-sm font-medium">
              <span>Conta ou cartão</span>
              <Select
                value={sourceFilter}
                onValueChange={(value) => setSourceFilter(value as SourceFilter)}
              >
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Todas as contas e cartões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas e cartões</SelectItem>
                  {activeAccounts.map((account) => (
                    <SelectItem key={`account:${account.id}`} value={`account:${account.id}`}>
                      Conta · {account.name}
                    </SelectItem>
                  ))}
                  {(cards.data ?? [])
                    .filter((card) => !card.is_archived)
                    .map((card) => (
                      <SelectItem key={`credit:${card.id}`} value={`credit:${card.id}`}>
                        Crédito · {card.name}
                      </SelectItem>
                    ))}
                  {(debitCards.data ?? [])
                    .filter((card) => !card.is_archived)
                    .map((card) => (
                      <SelectItem key={`debit:${card.id}`} value={`debit:${card.id}`}>
                        Débito · {card.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </label>

            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Filtrar por tipo de transação"
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
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <p>
              {filteredTransactions.length}{" "}
              {filteredTransactions.length === 1
                ? "movimentação encontrada"
                : "movimentações encontradas"}
              {renderedTransactions.length !== filteredTransactions.length
                ? ` em ${renderedTransactions.length} compras e movimentações`
                : ""}
            </p>
            <p className="flex items-center gap-1">
              Resultado confirmado:
              <MoneyDisplay value={filteredSummary.income - filteredSummary.expense} signed />
            </p>
          </div>

          {filteredTransactions.length ? (
            <div>
              {renderedTransactions.map((item) => {
                if (item.kind === "installment_purchase") {
                  const first = item.installments[0];
                  if (!first) return null;
                  return (
                    <InstallmentPurchaseItem
                      key={first.installment_group_id}
                      installments={item.installments}
                      invoicesById={invoiceMap}
                      categoryName={
                        first.category_id ? categoryMap.get(first.category_id) : undefined
                      }
                      cardName={
                        first.credit_card_id ? cardMap.get(first.credit_card_id) : undefined
                      }
                      onCancel={setCardPurchaseTarget}
                      onEdit={openEditCardPurchase}
                    />
                  );
                }

                const transaction = item.transaction;
                return (
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
                      transaction.credit_card_id
                        ? cardMap.get(transaction.credit_card_id)
                        : undefined
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
                    onDeleteCardPayment={setCardPaymentTarget}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={ArrowLeftRight}
              title={!hasActiveFilters ? "Nenhuma movimentação" : "Nenhuma movimentação encontrada"}
              description={
                hasActiveFilters
                  ? "Altere ou limpe os filtros para ver outras movimentações."
                  : "Adicione uma movimentação para começar a acompanhar seus números."
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                ) : (
                  <Button onClick={openCreate}>Adicionar movimentação</Button>
                )
              }
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
        open={Boolean(cardPaymentTarget)}
        onOpenChange={(open) => !open && setCardPaymentTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer este pagamento de fatura?</AlertDialogTitle>
            <AlertDialogDescription>
              O valor voltará para a fatura em aberto e o saldo da conta usada no pagamento será
              recalculado. Depois disso, você poderá cancelar a compra parcelada, se desejar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCreditCardPayment.isPending}
              onClick={undoCardPayment}
            >
              {deleteCreditCardPayment.isPending ? "Desfazendo..." : "Desfazer pagamento"}
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
                ? `As parcelas em aberto desta compra de ${cardPurchaseTarget?.total_installments}x serão removidas e o limite será recalculado.`
                : "A compra em aberto será removida, e o limite será recalculado."}
              {
                " Se alguma parcela já estiver em uma fatura paga, ela permanecerá no histórico para não alterar um pagamento já realizado."
              }
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
