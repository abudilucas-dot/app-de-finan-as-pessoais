import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Plus, Wallet } from "lucide-react";
import { useMemo } from "react";

import { AccountCard } from "@/components/app/AccountCard";
import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { PageHeader } from "@/components/app/PageHeader";
import { TransactionItem } from "@/components/app/TransactionItem";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { toBalanceMap, useAccountBalances } from "@/hooks/useAccountBalances";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useDebitCards } from "@/hooks/useDebitCards";
import { useProfile } from "@/hooks/useProfile";
import { useTransactions } from "@/hooks/useTransactions";
import { calculateMonthlySummary } from "@/lib/transactions";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [{ title: `Visão geral — ${brand.name}` }],
  }),
  component: DashboardPage,
});

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function DashboardPage() {
  const { data: profile } = useProfile();
  const accounts = useAccounts();
  const balances = useAccountBalances();
  const transactions = useTransactions();
  const categories = useCategories();
  const cards = useCreditCards();
  const debitCards = useDebitCards();

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
    accounts.isLoading ||
    balances.isLoading ||
    transactions.isLoading ||
    categories.isLoading ||
    cards.isLoading ||
    debitCards.isLoading
  ) {
    return <LoadingState label="Carregando seu resumo..." />;
  }
  if (
    accounts.isError ||
    balances.isError ||
    transactions.isError ||
    categories.isError ||
    cards.isError ||
    debitCards.isError
  ) {
    return (
      <ErrorState
        onRetry={() => {
          accounts.refetch();
          balances.refetch();
          transactions.refetch();
          categories.refetch();
          cards.refetch();
          debitCards.refetch();
        }}
      />
    );
  }

  const activeAccounts = (accounts.data ?? []).filter((account) => !account.is_archived);
  const balanceMap = toBalanceMap(balances.data);
  const totalBalance = activeAccounts.reduce(
    (total, account) => total + (balanceMap.get(account.id) ?? Number(account.initial_balance)),
    0,
  );
  const transactionList = transactions.data ?? [];
  const summary = calculateMonthlySummary(transactionList);
  const recentTransactions = transactionList.slice(0, 5);
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""} 👋`}
        description="Veja como estão suas finanças neste mês."
        actions={
          <Button asChild>
            <Link to="/transacoes" search={{ nova: true }}>
              <Plus aria-hidden="true" />
              Nova movimentação
            </Link>
          </Button>
        }
      />

      <section aria-label="Resumo financeiro" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="surface p-5">
          <p className="text-sm font-medium text-muted-foreground">Saldo total</p>
          <MoneyDisplay
            value={totalBalance}
            signed
            className="mt-2 block text-2xl font-semibold tracking-tight"
          />
          <p className="mt-2 text-xs text-muted-foreground">Somente contas ativas.</p>
        </article>
        <article className="surface p-5">
          <p className="text-sm font-medium text-muted-foreground">Receitas</p>
          <MoneyDisplay
            value={summary.income}
            className="mt-2 block text-2xl font-semibold text-positive"
          />
          <p className="mt-2 text-xs text-muted-foreground">Confirmadas neste mês.</p>
        </article>
        <article className="surface p-5">
          <p className="text-sm font-medium text-muted-foreground">Despesas</p>
          <MoneyDisplay
            value={summary.expense}
            className="mt-2 block text-2xl font-semibold text-negative"
          />
          <p className="mt-2 text-xs text-muted-foreground">Confirmadas neste mês.</p>
        </article>
        <article className="surface p-5">
          <p className="text-sm font-medium text-muted-foreground">Economizado</p>
          <MoneyDisplay
            value={summary.result}
            signed
            className="mt-2 block text-2xl font-semibold"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {summary.savingsRate === null
              ? "Sem receitas confirmadas."
              : `${summary.savingsRate.toFixed(1)}% das receitas`}
          </p>
        </article>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Suas contas</h2>
          {activeAccounts.length ? (
            <Link to="/contas" className="text-sm font-medium text-primary hover:underline">
              Ver todas
            </Link>
          ) : null}
        </div>

        {activeAccounts.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeAccounts.slice(0, 3).map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                currentBalance={balanceMap.get(account.id) ?? Number(account.initial_balance)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Wallet}
            title="Cadastre sua primeira conta"
            description="Adicione uma conta para começar a visualizar seu saldo."
            action={
              <Button asChild>
                <Link to="/contas">Adicionar conta</Link>
              </Button>
            }
          />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Últimas movimentações</h2>
          {recentTransactions.length ? (
            <Link to="/transacoes" className="text-sm font-medium text-primary hover:underline">
              Ver todas
            </Link>
          ) : null}
        </div>
        {recentTransactions.length ? (
          <div className="surface px-4 sm:px-6">
            {recentTransactions.map((transaction) => (
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
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ArrowLeftRight}
            title="Nenhuma movimentação ainda"
            description="Adicione sua primeira receita ou despesa para começar a acompanhar sua evolução."
            action={
              <Button asChild>
                <Link to="/transacoes" search={{ nova: true }}>
                  Adicionar movimentação
                </Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}
