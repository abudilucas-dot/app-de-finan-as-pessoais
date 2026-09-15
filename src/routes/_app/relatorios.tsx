import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, PieChart as PieChartIcon, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brand } from "@/config/brand";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import { formatMoney } from "@/lib/money";
import {
  type ReportPeriod,
  expenseCategoryData,
  filterReportTransactions,
  monthlyReportData,
  reportPeriodLabels,
  reportSummary,
} from "@/lib/reports";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: `Relatórios — ${brand.name}` }] }),
  component: ReportsPage,
});

const CATEGORY_COLORS = ["#0F766E", "#2563EB", "#7C3AED", "#D97706", "#DC2626", "#475569"];

function ReportsPage() {
  const transactions = useTransactions();
  const accounts = useAccounts();
  const categories = useCategories();
  const [period, setPeriod] = useState<ReportPeriod>("six_months");
  const [accountId, setAccountId] = useState("all");

  const activeAccounts = useMemo(
    () => (accounts.data ?? []).filter((account) => !account.is_archived),
    [accounts.data],
  );
  const categoryNames = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category.name])),
    [categories.data],
  );
  const filteredTransactions = useMemo(
    () => filterReportTransactions(transactions.data ?? [], period, accountId),
    [accountId, period, transactions.data],
  );
  const summary = useMemo(() => reportSummary(filteredTransactions), [filteredTransactions]);
  const monthlyData = useMemo(
    () => monthlyReportData(filteredTransactions, period),
    [filteredTransactions, period],
  );
  const categoriesData = useMemo(
    () => expenseCategoryData(filteredTransactions, categoryNames),
    [categoryNames, filteredTransactions],
  );

  if (transactions.isLoading || accounts.isLoading || categories.isLoading) {
    return <LoadingState label="Calculando seus relatórios..." />;
  }
  if (transactions.isError || accounts.isError || categories.isError) {
    return <ErrorState onRetry={() => { transactions.refetch(); accounts.refetch(); categories.refetch(); }} />;
  }

  const result = summary.income - summary.expense;
  const savingsRate = summary.income > 0 ? (result / summary.income) * 100 : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Relatórios"
        description="Entenda sua evolução com base nas movimentações realmente confirmadas."
      />

      <section className="surface grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-2">
          <label htmlFor="report-period" className="text-sm font-medium">Período</label>
          <Select value={period} onValueChange={(value) => setPeriod(value as ReportPeriod)}>
            <SelectTrigger id="report-period" className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(reportPeriodLabels) as [ReportPeriod, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="report-account" className="text-sm font-medium">Conta</label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger id="report-account" className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {activeAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </section>

      {filteredTransactions.length ? (
        <>
          <section aria-label="Resumo do período" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="surface p-5">
              <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Receitas</p><TrendingUp className="size-5 text-positive" aria-hidden="true" /></div>
              <MoneyDisplay value={summary.income} className="mt-2 block text-2xl font-semibold text-positive" />
              <p className="mt-2 text-xs text-muted-foreground">Entradas confirmadas.</p>
            </article>
            <article className="surface p-5">
              <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Despesas</p><TrendingDown className="size-5 text-negative" aria-hidden="true" /></div>
              <MoneyDisplay value={summary.expense} className="mt-2 block text-2xl font-semibold text-negative" />
              <p className="mt-2 text-xs text-muted-foreground">Gastos confirmados.</p>
            </article>
            <article className="surface p-5">
              <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Resultado</p><BarChart3 className="size-5 text-primary" aria-hidden="true" /></div>
              <MoneyDisplay value={result} signed className="mt-2 block text-2xl font-semibold" />
              <p className="mt-2 text-xs text-muted-foreground">Receitas menos despesas.</p>
            </article>
            <article className="surface p-5">
              <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Taxa de economia</p><WalletCards className="size-5 text-primary" aria-hidden="true" /></div>
              <p className="mt-2 text-2xl font-semibold">{savingsRate === null ? "—" : `${savingsRate.toFixed(1)}%`}</p>
              <p className="mt-2 text-xs text-muted-foreground">{savingsRate === null ? "Sem receitas no período." : "Do total de receitas."}</p>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
            <article className="surface p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="font-semibold">Receitas x despesas</h2>
                <p className="text-sm text-muted-foreground">Comparação mensal do período selecionado.</p>
              </div>
              {monthlyData.length ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${Math.round(Number(value) / 1000)}k`} />
                      <Tooltip formatter={(value) => formatMoney(Number(value))} />
                      <Bar dataKey="income" name="Receitas" fill="#16A34A" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="expense" name="Despesas" fill="#DC2626" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </article>

            <article className="surface p-5 sm:p-6">
              <div className="mb-4">
                <h2 className="font-semibold">Gastos por categoria</h2>
                <p className="text-sm text-muted-foreground">Maiores despesas confirmadas.</p>
              </div>
              {categoriesData.length ? (
                <>
                  <div className="mx-auto h-48 max-w-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoriesData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                          {categoriesData.map((category, index) => <Cell key={category.name} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => formatMoney(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-2">
                    {categoriesData.map((category, index) => (
                      <div key={category.name} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} /><span className="truncate">{category.name}</span></span>
                        <span className="font-medium">{formatMoney(category.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma despesa confirmada no período.</p>
              )}
            </article>
          </section>

          <p className="text-center text-xs text-muted-foreground">
            Transferências e pagamentos de fatura não entram nos relatórios de receitas e despesas.
          </p>
        </>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="Ainda não há dados para este relatório"
          description="Adicione movimentações confirmadas ou altere os filtros para visualizar sua evolução."
        />
      )}
    </div>
  );
}
