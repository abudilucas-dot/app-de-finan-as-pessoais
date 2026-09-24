import { createFileRoute } from "@tanstack/react-router";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  CreditCard as CreditCardIcon,
  Landmark,
  Pencil,
  Plus,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CardExpenseDialog } from "@/components/app/CardExpenseDialog";
import { CreditCardFormDialog } from "@/components/app/CreditCardFormDialog";
import { DebitCardFormDialog } from "@/components/app/DebitCardFormDialog";
import { InvoicePaymentDialog } from "@/components/app/InvoicePaymentDialog";
import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { PageHeader } from "@/components/app/PageHeader";
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
import { useDebitCards, useUpdateDebitCard } from "@/hooks/useDebitCards";
import {
  useCreditCardInvoices,
  useCreditCards,
  useCreditCardSummaries,
  useUpdateCreditCard,
} from "@/hooks/useCreditCards";
import { type CreditCard, type CreditCardInvoice, formatShortDate } from "@/lib/creditCards";
import { type DebitCard } from "@/lib/debitCards";
import { type FinancialTransaction } from "@/lib/transactions";
import { useTransactions } from "@/hooks/useTransactions";

export const Route = createFileRoute("/_app/cartoes")({
  head: () => ({ meta: [{ title: `Cartões — ${brand.name}` }] }),
  component: CreditCardsPage,
});

function invoiceBalances(transactions: FinancialTransaction[]) {
  const values = new Map<string, number>();
  for (const transaction of transactions) {
    if (!transaction.invoice_id || transaction.status !== "confirmed") continue;
    const difference =
      transaction.type === "expense"
        ? Number(transaction.amount)
        : transaction.type === "card_payment"
          ? -Number(transaction.amount)
          : 0;
    values.set(transaction.invoice_id, (values.get(transaction.invoice_id) ?? 0) + difference);
  }
  return values;
}

function invoiceStatus(status: CreditCardInvoice["status"]) {
  return status === "paid"
    ? "Paga"
    : status === "overdue"
      ? "Atrasada"
      : status === "closed"
        ? "Fechada"
        : "Aberta";
}


type InstallmentInvoiceItem = {
  transaction: FinancialTransaction;
  invoice: CreditCardInvoice;
  amount: number;
  isPaid: boolean;
};

type InstallmentInvoiceGroup = {
  id: string;
  cardId: string;
  description: string;
  totalInstallments: number;
  totalAmount: number;
  paidCount: number;
  openItems: InstallmentInvoiceItem[];
  items: InstallmentInvoiceItem[];
  nextItem: InstallmentInvoiceItem;
};

function stripInstallmentSuffix(description: string) {
  return description.replace(/ \(\d+\/\d+\)$/, "");
}

function buildInstallmentInvoiceGroups(
  transactions: FinancialTransaction[],
  invoices: CreditCardInvoice[],
  balances: Map<string, number>,
) {
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const byGroup = new Map<string, FinancialTransaction[]>();

  for (const transaction of transactions) {
    if (
      transaction.type !== "expense" ||
      !transaction.credit_card_id ||
      !transaction.installment_group_id ||
      (transaction.total_installments ?? 1) < 2 ||
      !transaction.invoice_id
    ) {
      continue;
    }
    const invoice = invoiceById.get(transaction.invoice_id);
    if (!invoice) continue;
    const entries = byGroup.get(transaction.installment_group_id) ?? [];
    entries.push(transaction);
    byGroup.set(transaction.installment_group_id, entries);
  }

  return [...byGroup.entries()]
    .map(([id, transactionsInGroup]) => {
      const items = transactionsInGroup
        .map((transaction) => {
          const invoice = invoiceById.get(transaction.invoice_id!);
          if (!invoice) return null;
          const isPaid =
            invoice.status === "paid" || (balances.get(invoice.id) ?? 0) <= 0.005;
          return {
            transaction,
            invoice,
            amount: Number(transaction.amount),
            isPaid,
          } satisfies InstallmentInvoiceItem;
        })
        .filter((item): item is InstallmentInvoiceItem => Boolean(item))
        .sort((a, b) => {
          const installmentDifference =
            (a.transaction.installment_number ?? 1) - (b.transaction.installment_number ?? 1);
          return installmentDifference || a.invoice.due_date.localeCompare(b.invoice.due_date);
        });

      const openItems = items
        .filter((item) => !item.isPaid)
        .sort((a, b) => a.invoice.due_date.localeCompare(b.invoice.due_date));
      const first = items[0];
      const nextItem = openItems[0];
      if (!first || !nextItem) return null;

      return {
        id,
        cardId: first.transaction.credit_card_id!,
        description: stripInstallmentSuffix(first.transaction.description),
        totalInstallments: first.transaction.total_installments ?? items.length,
        totalAmount: items.reduce((total, item) => total + item.amount, 0),
        paidCount: items.filter((item) => item.isPaid).length,
        openItems,
        items,
        nextItem,
      } satisfies InstallmentInvoiceGroup;
    })
    .filter((group): group is InstallmentInvoiceGroup => Boolean(group))
    .sort((a, b) => a.nextItem.invoice.due_date.localeCompare(b.nextItem.invoice.due_date));
}

function CreditCardsPage() {
  const cards = useCreditCards();
  const summaries = useCreditCardSummaries();
  const invoices = useCreditCardInvoices();
  const transactions = useTransactions();
  const accounts = useAccounts();
  const debitCards = useDebitCards();
  const updateCard = useUpdateCreditCard();
  const updateDebitCard = useUpdateDebitCard();
  const [formOpen, setFormOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [debitFormOpen, setDebitFormOpen] = useState(false);
  const [editingDebit, setEditingDebit] = useState<DebitCard | null>(null);
  const [expenseCard, setExpenseCard] = useState<CreditCard | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CreditCard | null>(null);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{
    invoice: CreditCardInvoice;
    card: CreditCard;
    amount: number;
  } | null>(null);

  const loading =
    cards.isLoading ||
    summaries.isLoading ||
    invoices.isLoading ||
    transactions.isLoading ||
    accounts.isLoading;
  const debitLoading = debitCards.isLoading;
  const failure =
    cards.isError ||
    summaries.isError ||
    invoices.isError ||
    transactions.isError ||
    accounts.isError;
  const debitFailure = debitCards.isError;
  const summaryByCard = useMemo(
    () => new Map((summaries.data ?? []).map((summary) => [summary.credit_card_id, summary])),
    [summaries.data],
  );
  const cardById = useMemo(
    () => new Map((cards.data ?? []).map((card) => [card.id, card])),
    [cards.data],
  );
  const invoiceBalanceById = useMemo(
    () => invoiceBalances(transactions.data ?? []),
    [transactions.data],
  );
  const installmentInvoiceGroups = useMemo(
    () =>
      buildInstallmentInvoiceGroups(
        transactions.data ?? [],
        invoices.data ?? [],
        invoiceBalanceById,
      ),
    [transactions.data, invoices.data, invoiceBalanceById],
  );
  const installmentInvoiceIds = useMemo(
    () => new Set(installmentInvoiceGroups.flatMap((group) => group.items.map((item) => item.invoice.id))),
    [installmentInvoiceGroups],
  );

  if (loading || debitLoading) return <LoadingState label="Carregando seus cartões..." />;
  if (failure || debitFailure)
    return (
      <ErrorState
        onRetry={() => {
          cards.refetch();
          summaries.refetch();
          invoices.refetch();
          transactions.refetch();
          accounts.refetch();
          debitCards.refetch();
        }}
      />
    );

  const allCards = cards.data ?? [];
  const activeCards = allCards.filter((card) => !card.is_archived);
  const archivedCards = allCards.filter((card) => card.is_archived);
  const allDebitCards = debitCards.data ?? [];
  const activeDebitCards = allDebitCards.filter((card) => !card.is_archived);
  const archivedDebitCards = allDebitCards.filter((card) => card.is_archived);
  const pendingInvoices = (invoices.data ?? []).filter(
    (invoice) => (invoiceBalanceById.get(invoice.id) ?? 0) > 0.005 && invoice.status !== "paid",
  );
  const standalonePendingInvoices = pendingInvoices.filter(
    (invoice) => !installmentInvoiceIds.has(invoice.id),
  );
  const totalAvailable = activeCards.reduce(
    (total, card) =>
      total + Number(summaryByCard.get(card.id)?.available_limit ?? card.total_limit),
    0,
  );
  const totalOutstanding = activeCards.reduce(
    (total, card) => total + Number(summaryByCard.get(card.id)?.outstanding_balance ?? 0),
    0,
  );

  const archiveCard = async (card: CreditCard) => {
    try {
      await updateCard.mutateAsync({ id: card.id, is_archived: !card.is_archived });
      toast.success(card.is_archived ? "Cartão reativado." : "Cartão arquivado.");
    } catch {
      toast.error("Não foi possível alterar o status do cartão.");
    } finally {
      setArchiveTarget(null);
    }
  };
  const toggleDebitCard = async (card: DebitCard) => {
    try {
      await updateDebitCard.mutateAsync({ id: card.id, is_archived: !card.is_archived });
      toast.success(
        card.is_archived ? "Cartão de débito reativado." : "Cartão de débito arquivado.",
      );
    } catch {
      toast.error("Não foi possível alterar o status do cartão de débito.");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cartões"
        description="Acompanhe o limite e pague faturas sem duplicar suas despesas."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setExpenseCard(null);
                setExpenseOpen(true);
              }}
              disabled={activeCards.length === 0}
            >
              <ShoppingBag aria-hidden="true" />
              Nova compra
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus aria-hidden="true" />
              Novo crédito
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingDebit(null);
                setDebitFormOpen(true);
              }}
              disabled={(accounts.data ?? []).every((account) => account.is_archived)}
            >
              <Plus aria-hidden="true" />
              Novo débito
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="surface border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-5">
          <p className="text-sm text-muted-foreground">Limite disponível</p>
          <MoneyDisplay
            value={totalAvailable}
            className="mt-2 block text-2xl font-semibold text-positive"
          />
          <p className="mt-2 text-xs text-muted-foreground">Somente cartões ativos.</p>
        </article>
        <article className="surface border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-orange-500/5 to-transparent p-5">
          <p className="text-sm text-muted-foreground">Faturas em aberto</p>
          <MoneyDisplay
            value={totalOutstanding}
            className="mt-2 block text-2xl font-semibold text-negative"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Compras confirmadas ainda não quitadas.
          </p>
        </article>
      </section>

      {activeCards.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Cartões ativos</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeCards.map((card) => {
              const summary = summaryByCard.get(card.id);
              const available = Number(summary?.available_limit ?? card.total_limit);
              const outstanding = Number(summary?.outstanding_balance ?? 0);
              return (
                <article key={card.id} className="surface overflow-hidden">
                  <div
                    className="p-5 text-primary-foreground"
                    style={{ backgroundColor: card.color ?? "#0F766E" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold">{card.name}</h3>
                        <p className="truncate text-sm text-primary-foreground/80">
                          {card.institution ?? card.brand ?? "Cartão de crédito"}
                        </p>
                      </div>
                      <CreditCardIcon aria-hidden="true" className="h-6 w-6" />
                    </div>
                    <p className="mt-8 text-xs uppercase tracking-wide text-primary-foreground/75">
                      Limite disponível
                    </p>
                    <MoneyDisplay
                      value={available}
                      className="mt-1 block text-2xl font-semibold text-primary-foreground"
                    />
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Em aberto</span>
                      <MoneyDisplay value={outstanding} className="font-semibold" />
                    </div>
                    <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                      <span>Fecha dia {card.closing_day}</span>
                      <span>Vence dia {card.due_day}</span>
                    </div>
                    <div className="flex gap-2 border-t pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setExpenseCard(card);
                          setExpenseOpen(true);
                        }}
                      >
                        <ShoppingBag aria-hidden="true" />
                        Compra
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(card);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil aria-hidden="true" />
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setArchiveTarget(card)}>
                        <Archive aria-hidden="true" />
                        Arquivar
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={CreditCardIcon}
          title="Nenhum cartão ativo"
          description="Cadastre um cartão para organizar as compras e faturas."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Adicionar cartão
            </Button>
          }
        />
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Cartões de débito</h2>
        </div>
        {activeDebitCards.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeDebitCards.map((card) => {
              const account = (accounts.data ?? []).find((item) => item.id === card.account_id);
              return (
                <article key={card.id} className="surface overflow-hidden">
                  <div
                    className="p-5 text-primary-foreground"
                    style={{ backgroundColor: card.color ?? "#2563EB" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold">{card.name}</h3>
                        <p className="truncate text-sm text-primary-foreground/80">
                          {card.institution ?? card.brand ?? "Cartão de débito"}
                        </p>
                      </div>
                      <Landmark aria-hidden="true" className="h-6 w-6" />
                    </div>
                    <p className="mt-8 text-xs uppercase tracking-wide text-primary-foreground/75">
                      Conta vinculada
                    </p>
                    <p className="mt-1 truncate text-lg font-semibold">
                      {account?.name ?? "Conta indisponível"}
                    </p>
                  </div>
                  <div className="flex gap-2 p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingDebit(card);
                        setDebitFormOpen(true);
                      }}
                    >
                      <Pencil aria-hidden="true" />
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleDebitCard(card)}>
                      <Archive aria-hidden="true" />
                      Arquivar
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Landmark}
            title="Nenhum cartão de débito"
            description="Cadastre um cartão vinculado a uma conta para identificá-lo nas despesas."
            action={
              <Button
                onClick={() => {
                  setEditingDebit(null);
                  setDebitFormOpen(true);
                }}
                disabled={(accounts.data ?? []).every((account) => account.is_archived)}
              >
                Adicionar cartão de débito
              </Button>
            }
            className="py-10"
          />
        )}
        {archivedDebitCards.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {archivedDebitCards.map((card) => (
              <article
                key={card.id}
                className="surface flex items-center justify-between gap-3 p-4"
              >
                <div>
                  <h3 className="font-semibold">{card.name}</h3>
                  <p className="text-sm text-muted-foreground">Cartão de débito arquivado</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => toggleDebitCard(card)}>
                  Reativar
                </Button>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300">
            <ReceiptText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Faturas e compras parceladas</h2>
            <p className="text-sm text-muted-foreground">
              Parcelas da mesma compra ficam juntas para deixar sua fatura mais clara.
            </p>
          </div>
        </div>

        {pendingInvoices.length ? (
          <div className="space-y-4">
            {installmentInvoiceGroups.length ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Compras parceladas</h3>
                {installmentInvoiceGroups.map((group, index) => {
                  const card = cardById.get(group.cardId);
                  const accent = [
                    "border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent",
                    "border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-cyan-500/5 to-transparent",
                    "border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent",
                    "border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent",
                  ][index % 4]!;
                  const expanded = expandedPurchaseId === group.id;
                  const nextAmount = invoiceBalanceById.get(group.nextItem.invoice.id) ?? 0;
                  return (
                    <article key={group.id} className={`surface overflow-hidden border ${accent}`}>
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold">{group.description}</h3>
                            <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-xs font-semibold">
                              {group.totalInstallments}x
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {card?.name ?? "Cartão"} · {group.paidCount} paga{group.paidCount === 1 ? "" : "s"} · {group.openItems.length} em aberto
                          </p>
                          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="text-xs text-muted-foreground">Total da compra</span>
                            <MoneyDisplay value={group.totalAmount} className="text-base font-semibold" />
                            <span className="text-xs text-muted-foreground">
                              Próximo vencimento: {formatShortDate(group.nextItem.invoice.due_date)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedPurchaseId(expanded ? null : group.id)}
                            aria-expanded={expanded}
                          >
                            {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                            {expanded ? "Ocultar parcelas" : "Ver parcelas"}
                          </Button>
                          <Button
                            size="sm"
                            disabled={!card}
                            onClick={() =>
                              card &&
                              setPaymentTarget({
                                invoice: group.nextItem.invoice,
                                card,
                                amount: nextAmount,
                              })
                            }
                          >
                            Pagar próxima
                          </Button>
                        </div>
                      </div>

                      {expanded ? (
                        <div className="border-t bg-background/45 px-4 py-2 sm:px-5">
                          {group.items.map((item) => (
                            <div
                              key={item.transaction.id}
                              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border/70 py-3 last:border-b-0"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  Parcela {item.transaction.installment_number ?? 1}/{group.totalInstallments}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Vence em {formatShortDate(item.invoice.due_date)}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={item.isPaid
                                    ? "rounded-full bg-positive/10 px-2 py-0.5 text-xs font-semibold text-positive"
                                    : "rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300"}
                                >
                                  {item.isPaid ? "Paga" : "Em aberto"}
                                </span>
                                <MoneyDisplay value={item.amount} className="text-sm font-semibold" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null}

            {standalonePendingInvoices.length ? (
              <div className="surface divide-y overflow-hidden border border-sky-500/20">
                <div className="bg-sky-500/5 px-4 py-3">
                  <h3 className="text-sm font-semibold">Faturas avulsas</h3>
                </div>
                {standalonePendingInvoices.map((invoice) => {
                  const card = cardById.get(invoice.credit_card_id);
                  const amount = invoiceBalanceById.get(invoice.id) ?? 0;
                  return (
                    <article
                      key={invoice.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <h3 className="font-semibold">{card?.name ?? "Cartão"}</h3>
                        <p className="text-sm text-muted-foreground">
                          Fatura {invoiceStatus(invoice.status).toLowerCase()} · vence em{" "}
                          {formatShortDate(invoice.due_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <MoneyDisplay value={amount} className="text-base font-semibold" />
                        <Button
                          size="sm"
                          disabled={!card}
                          onClick={() => card && setPaymentTarget({ invoice, card, amount })}
                        >
                          Pagar fatura
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={ReceiptText}
            title="Nenhuma fatura pendente"
            description="As compras no cartão aparecerão aqui para pagamento."
            className="py-10"
          />
        )}
      </section>

      {archivedCards.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Arquivados</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {archivedCards.map((card) => (
              <article
                key={card.id}
                className="surface flex items-center justify-between gap-4 p-5"
              >
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{card.name}</h3>
                  <p className="text-sm text-muted-foreground">Cartão arquivado</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => archiveCard(card)}>
                  Reativar
                </Button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <CreditCardFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        card={editing}
        accounts={accounts.data ?? []}
      />
      <DebitCardFormDialog
        open={debitFormOpen}
        onOpenChange={setDebitFormOpen}
        card={editingDebit}
        accounts={accounts.data ?? []}
      />
      <CardExpenseDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        cards={allCards}
        defaultCard={expenseCard}
      />
      <InvoicePaymentDialog
        open={Boolean(paymentTarget)}
        onOpenChange={(open) => {
          if (!open) setPaymentTarget(null);
        }}
        invoice={paymentTarget?.invoice ?? null}
        card={paymentTarget?.card ?? null}
        amount={paymentTarget?.amount ?? 0}
        accounts={accounts.data ?? []}
      />
      <AlertDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar este cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Ele deixa de aparecer para novas compras, mas o histórico continua salvo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateCard.isPending}
              onClick={() => archiveTarget && archiveCard(archiveTarget)}
            >
              {updateCard.isPending ? "Arquivando..." : "Arquivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
