import { createFileRoute } from "@tanstack/react-router";
import {
  Archive,
  CreditCard as CreditCardIcon,
  Pencil,
  Plus,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CardExpenseDialog } from "@/components/app/CardExpenseDialog";
import { CreditCardFormDialog } from "@/components/app/CreditCardFormDialog";
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
import {
  useCreditCardInvoices,
  useCreditCards,
  useCreditCardSummaries,
  useUpdateCreditCard,
} from "@/hooks/useCreditCards";
import { type CreditCard, type CreditCardInvoice, formatShortDate } from "@/lib/creditCards";
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

function CreditCardsPage() {
  const cards = useCreditCards();
  const summaries = useCreditCardSummaries();
  const invoices = useCreditCardInvoices();
  const transactions = useTransactions();
  const accounts = useAccounts();
  const updateCard = useUpdateCreditCard();
  const [formOpen, setFormOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [expenseCard, setExpenseCard] = useState<CreditCard | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CreditCard | null>(null);
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
  const failure =
    cards.isError ||
    summaries.isError ||
    invoices.isError ||
    transactions.isError ||
    accounts.isError;
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

  if (loading) return <LoadingState label="Carregando seus cartões..." />;
  if (failure)
    return (
      <ErrorState
        onRetry={() => {
          cards.refetch();
          summaries.refetch();
          invoices.refetch();
          transactions.refetch();
          accounts.refetch();
        }}
      />
    );

  const allCards = cards.data ?? [];
  const activeCards = allCards.filter((card) => !card.is_archived);
  const archivedCards = allCards.filter((card) => card.is_archived);
  const pendingInvoices = (invoices.data ?? []).filter(
    (invoice) => (invoiceBalanceById.get(invoice.id) ?? 0) > 0.005 && invoice.status !== "paid",
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
              Novo cartão
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="surface p-5">
          <p className="text-sm text-muted-foreground">Limite disponível</p>
          <MoneyDisplay
            value={totalAvailable}
            className="mt-2 block text-2xl font-semibold text-positive"
          />
          <p className="mt-2 text-xs text-muted-foreground">Somente cartões ativos.</p>
        </article>
        <article className="surface p-5">
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
          <ReceiptText className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Faturas para pagar</h2>
        </div>
        {pendingInvoices.length ? (
          <div className="surface divide-y">
            {pendingInvoices.map((invoice) => {
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
      <CardExpenseDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        cards={allCards}
        defaultCard={expenseCard}
      />
      <InvoicePaymentDialog
        open={Boolean(paymentTarget)}
        onOpenChange={(open) => !open && setPaymentTarget(null)}
        invoice={paymentTarget?.invoice}
        card={paymentTarget?.card}
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
