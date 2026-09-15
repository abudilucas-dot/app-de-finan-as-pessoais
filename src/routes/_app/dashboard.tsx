import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeftRight, CalendarClock, CreditCard, Plus, Target, Wallet } from "lucide-react";
import { useMemo } from "react";

import { AccountCard } from "@/components/app/AccountCard";
import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { PageHeader } from "@/components/app/PageHeader";
import { TransactionItem } from "@/components/app/TransactionItem";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { brand } from "@/config/brand";
import { toBalanceMap, useAccountBalances } from "@/hooks/useAccountBalances";
import { useAccounts } from "@/hooks/useAccounts";
import { useBudgetSummaries } from "@/hooks/useBudgets";
import { useCategories } from "@/hooks/useCategories";
import { useCreditCardInvoices, useCreditCards } from "@/hooks/useCreditCards";
import { useDebitCards } from "@/hooks/useDebitCards";
import { useGoalSummaries } from "@/hooks/useGoals";
import { useProfile } from "@/hooks/useProfile";
import { useRecurringRules } from "@/hooks/useRecurringRules";
import { useTransactions } from "@/hooks/useTransactions";
import { budgetPercentage, periodStart } from "@/lib/budgets";
import { formatShortDate } from "@/lib/creditCards";
import { goalProgress } from "@/lib/goals";
import { formatScheduledDate, todayDate } from "@/lib/recurringRules";
import { calculateMonthlySummary } from "@/lib/transactions";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: `Visão geral — ${brand.name}` }] }),
  component: DashboardPage,
});

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function DashboardPage() {
  const currentPeriod = periodStart();
  const { data: profile } = useProfile();
  const accounts = useAccounts();
  const balances = useAccountBalances();
  const transactions = useTransactions();
  const categories = useCategories();
  const cards = useCreditCards();
  const invoices = useCreditCardInvoices();
  const debitCards = useDebitCards();
  const budgets = useBudgetSummaries(currentPeriod);
  const goals = useGoalSummaries();
  const recurringRules = useRecurringRules();

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
  const invoiceBalances = useMemo(() => {
    const values = new Map<string, number>();
    for (const transaction of transactions.data ?? []) {
      if (!transaction.invoice_id || transaction.status !== "confirmed") continue;
      const change =
        transaction.type === "expense"
          ? Number(transaction.amount)
          : transaction.type === "card_payment"
            ? -Number(transaction.amount)
            : 0;
      values.set(transaction.invoice_id, (values.get(transaction.invoice_id) ?? 0) + change);
    }
    return values;
  }, [transactions.data]);

  if (
    accounts.isLoading ||
    balances.isLoading ||
    transactions.isLoading ||
    categories.isLoading ||
    cards.isLoading ||
    invoices.isLoading ||
    debitCards.isLoading ||
    budgets.isLoading ||
    goals.isLoading ||
    recurringRules.isLoading
  ) {
    return <LoadingState label="Carregando seu resumo..." />;
  }
  if (
    accounts.isError ||
    balances.isError ||
    transactions.isError ||
    categories.isError ||
    cards.isError ||
    invoices.isError ||
    debitCards.isError ||
    budgets.isError ||
    goals.isError ||
    recurringRules.isError
  ) {
    return (
      <ErrorState
        onRetry={() => {
          accounts.refetch();
          balances.refetch();
          transactions.refetch();
          categories.refetch();
          cards.refetch();
          invoices.refetch();
          debitCards.refetch();
          budgets.refetch();
          goals.refetch();
          recurringRules.refetch();
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
  const scheduled = (recurringRules.data ?? []).slice(0, 3);
  const pendingInvoices = (invoices.data ?? [])
    .filter((invoice) => invoice.status !== "paid" && (invoiceBalances.get(invoice.id) ?? 0) > 0.005)
    .slice(0, 3);
  const budgetAlerts = (budgets.data ?? [])
    .map((budget) => ({ ...budget, percentage: budgetPercentage(Number(budget.spent_amount), Number(budget.amount_limit)) }))
    .filter((budget) => budget.percentage >= 80)
    .sort((left, right) => right.percentage - left.percentage)
    .slice(0, 3);
  const activeGoals = (goals.data ?? []).slice(0, 3);

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
          <MoneyDisplay value={totalBalance} signed className="mt-2 block text-2xl font-semibold tracking-tight" />
          <p className="mt-2 text-xs text-muted-foreground">Somente contas ativas.</p>
        </article>
        <article className="surface p-5">
          <p className="text-sm font-medium text-muted-foreground">Receitas</p>
          <MoneyDisplay value={summary.income} className="mt-2 block text-2xl font-semibold text-positive" />
          <p className="mt-2 text-xs text-muted-foreground">Confirmadas neste mês.</p>
        </article>
        <article className="surface p-5">
          <p className="text-sm font-medium text-muted-foreground">Despesas</p>
          <MoneyDisplay value={summary.expense} className="mt-2 block text-2xl font-semibold text-negative" />
          <p className="mt-2 text-xs text-muted-foreground">Confirmadas neste mês.</p>
        </article>
        <article className="surface p-5">
          <p className="text-sm font-medium text-muted-foreground">Economizado</p>
          <MoneyDisplay value={summary.result} signed className="mt-2 block text-2xl font-semibold" />
          <p className="mt-2 text-xs text-muted-foreground">
            {summary.savingsRate === null ? "Sem receitas confirmadas." : `${summary.savingsRate.toFixed(1)}% das receitas`}
          </p>
        </article>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link to="/transacoes" search={{ nova: true }} className="surface flex items-center gap-3 p-4 transition-colors hover:border-primary/50">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Plus className="size-5" aria-hidden="true" /></span>
          <span><strong className="block text-sm">Nova movimentação</strong><small className="text-muted-foreground">Receita, despesa ou transferência</small></span>
        </Link>
        <Link to="/calendario" className="surface flex items-center gap-3 p-4 transition-colors hover:border-primary/50">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarClock className="size-5" aria-hidden="true" /></span>
          <span><strong className="block text-sm">Ver calendário</strong><small className="text-muted-foreground">Contas programadas e próximos itens</small></span>
        </Link>
        <Link to="/cartoes" className="surface flex items-center gap-3 p-4 transition-colors hover:border-primary/50">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><CreditCard className="size-5" aria-hidden="true" /></span>
          <span><strong className="block text-sm">Gerenciar cartões</strong><small className="text-muted-foreground">Compras, limite e faturas</small></span>
        </Link>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="surface p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="font-semibold">Próximos compromissos</h2><p className="text-sm text-muted-foreground">Itens que ainda não alteraram seu saldo.</p></div>
            <Link to="/calendario" className="text-sm font-medium text-primary hover:underline">Ver calendário</Link>
          </div>
          {scheduled.length || pendingInvoices.length ? (
            <div className="divide-y">
              {scheduled.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{rule.description}</p><p className="text-xs text-muted-foreground">{rule.type === "expense" ? "Despesa" : "Receita"} · {formatScheduledDate(rule.next_occurrence)}</p></div>
                  <MoneyDisplay value={rule.amount} className={rule.type === "expense" ? "shrink-0 font-semibold text-negative" : "shrink-0 font-semibold text-positive"} />
                </div>
              ))}
              {pendingInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between gap-3 py-3 last:pb-0">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">Fatura {cardMap.get(invoice.credit_card_id) ?? "do cartão"}</p><p className="text-xs text-muted-foreground">Vence em {formatShortDate(invoice.due_date)}</p></div>
                  <MoneyDisplay value={invoiceBalances.get(invoice.id) ?? 0} className="shrink-0 font-semibold text-negative" />
                </div>
              ))}
            </div>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">Nenhum compromisso pendente por enquanto.</p>}
        </article>

        <article className="surface p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="font-semibold">Alertas de orçamento</h2><p className="text-sm text-muted-foreground">Categorias que já consumiram 80% ou mais.</p></div>
            <AlertTriangle className="size-5 text-warning" aria-hidden="true" />
          </div>
          {budgetAlerts.length ? (
            <div className="space-y-4">
              {budgetAlerts.map((budget) => (
                <Link key={budget.id} to="/orcamentos" className="block rounded-lg border p-3 transition-colors hover:border-primary/50">
                  <div className="flex items-center justify-between gap-3"><span className="font-medium">{categoryMap.get(budget.category_id) ?? "Categoria"}</span><span className={budget.percentage >= 100 ? "text-sm font-semibold text-negative" : "text-sm font-semibold text-warning"}>{budget.percentage.toFixed(0)}%</span></div>
                  <Progress value={Math.min(budget.percentage, 100)} className="mt-2" indicatorClassName={budget.percentage >= 100 ? "bg-negative" : "bg-warning"} />
                  <p className="mt-2 text-xs text-muted-foreground"><MoneyDisplay value={budget.spent_amount} /> de <MoneyDisplay value={budget.amount_limit} /></p>
                </Link>
              ))}
            </div>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">Nenhum orçamento próximo do limite.</p>}
        </article>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold tracking-tight">Metas em andamento</h2><Link to="/metas" className="text-sm font-medium text-primary hover:underline">Ver metas</Link></div>
        {activeGoals.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeGoals.map((goal) => {
              const progress = goalProgress(Number(goal.current_amount), Number(goal.target_amount));
              return <Link key={goal.id} to="/metas" className="surface block p-5 transition-colors hover:border-primary/50">
                <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: goal.color ?? "#0F766E" }} /><h3 className="truncate font-semibold">{goal.name}</h3></div><Target className="size-5 text-primary" aria-hidden="true" /></div>
                <div className="mt-5 flex items-end justify-between gap-3"><span><MoneyDisplay value={goal.current_amount} className="font-semibold" /><span className="text-sm text-muted-foreground"> de <MoneyDisplay value={goal.target_amount} /></span></span><span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span></div>
                <Progress value={Math.min(progress, 100)} className="mt-3" />
              </Link>;
            })}
          </div>
        ) : <EmptyState icon={Target} title="Nenhuma meta em andamento" description="Crie uma meta para acompanhar seus próximos objetivos." action={<Button asChild><Link to="/metas">Criar meta</Link></Button>} className="py-10" />}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Suas contas</h2>
          {activeAccounts.length ? <Link to="/contas" className="text-sm font-medium text-primary hover:underline">Ver todas</Link> : null}
        </div>
        {activeAccounts.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeAccounts.slice(0, 3).map((account) => <AccountCard key={account.id} account={account} currentBalance={balanceMap.get(account.id) ?? Number(account.initial_balance)} />)}
          </div>
        ) : <EmptyState icon={Wallet} title="Cadastre sua primeira conta" description="Adicione uma conta para começar a visualizar seu saldo." action={<Button asChild><Link to="/contas">Adicionar conta</Link></Button>} />}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Últimas movimentações</h2>
          {recentTransactions.length ? <Link to="/transacoes" className="text-sm font-medium text-primary hover:underline">Ver todas</Link> : null}
        </div>
        {recentTransactions.length ? (
          <div className="surface px-4 sm:px-6">
            {recentTransactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                accountName={transaction.account_id ? accountMap.get(transaction.account_id) : undefined}
                destinationAccountName={transaction.destination_account_id ? accountMap.get(transaction.destination_account_id) : undefined}
                categoryName={transaction.category_id ? categoryMap.get(transaction.category_id) : undefined}
                cardName={transaction.credit_card_id ? cardMap.get(transaction.credit_card_id) : undefined}
                debitCardName={transaction.debit_card_id ? debitCardMap.get(transaction.debit_card_id) : undefined}
              />
            ))}
          </div>
        ) : <EmptyState icon={ArrowLeftRight} title="Nenhuma movimentação ainda" description="Adicione sua primeira receita ou despesa para começar a acompanhar sua evolução." action={<Button asChild><Link to="/transacoes" search={{ nova: true }}>Adicionar movimentação</Link></Button>} />}
      </section>
    </div>
  );
}
