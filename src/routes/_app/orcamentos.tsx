import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, TriangleAlert, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BudgetFormDialog } from "@/components/app/BudgetFormDialog";
import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { brand } from "@/config/brand";
import { useCategories } from "@/hooks/useCategories";
import { useBudgetSummaries, useDeleteBudget } from "@/hooks/useBudgets";
import { budgetPercentage, formatBudgetPeriod, periodStart, type Budget } from "@/lib/budgets";

export const Route = createFileRoute("/_app/orcamentos")({
  head: () => ({ meta: [{ title: `Orçamentos — ${brand.name}` }] }),
  component: BudgetsPage,
});

function BudgetsPage() {
  const currentPeriod = periodStart();
  const categories = useCategories("expense");
  const budgets = useBudgetSummaries(currentPeriod);
  const deleteBudget = useDeleteBudget();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const categoryMap = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category.name])),
    [categories.data],
  );

  if (categories.isLoading || budgets.isLoading) return <LoadingState label="Carregando seus orçamentos..." />;
  if (categories.isError || budgets.isError) {
    return <ErrorState onRetry={() => { categories.refetch(); budgets.refetch(); }} />;
  }

  const summaries = budgets.data ?? [];
  const totalLimit = summaries.reduce((total, budget) => total + Number(budget.amount_limit), 0);
  const totalSpent = summaries.reduce((total, budget) => total + Number(budget.spent_amount), 0);

  const remove = async (id: string) => {
    if (!window.confirm("Remover este orçamento?")) return;
    try {
      await deleteBudget.mutateAsync(id);
      toast.success("Orçamento removido.");
    } catch {
      toast.error("Não foi possível remover o orçamento.");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Orçamentos"
        description={`Acompanhe seus limites de gasto em ${formatBudgetPeriod(currentPeriod)}.`}
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus aria-hidden="true" />Novo orçamento</Button>}
      />

      {summaries.length ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <article className="surface p-5"><p className="text-sm text-muted-foreground">Limites definidos</p><MoneyDisplay value={totalLimit} className="mt-2 block text-2xl font-semibold" /></article>
            <article className="surface p-5"><p className="text-sm text-muted-foreground">Gasto no orçamento</p><MoneyDisplay value={totalSpent} className="mt-2 block text-2xl font-semibold text-negative" /></article>
          </section>

          <section className="space-y-4">
            {summaries.map((budget) => {
              const spent = Number(budget.spent_amount);
              const limit = Number(budget.amount_limit);
              const percentage = budgetPercentage(spent, limit);
              const tone = percentage >= 100 ? "bg-destructive" : percentage >= 90 ? "bg-warning" : "bg-primary";
              return (
                <article key={budget.id} className="surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h2 className="truncate text-base font-semibold">{categoryMap.get(budget.category_id) ?? "Categoria"}</h2><p className="mt-1 text-sm text-muted-foreground"><MoneyDisplay value={spent} /> de <MoneyDisplay value={limit} /></p></div>
                    <div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" aria-label="Editar orçamento" onClick={() => { setEditing(budget); setFormOpen(true); }}><Pencil /></Button><Button variant="ghost" size="icon" aria-label="Remover orçamento" onClick={() => remove(budget.id)} disabled={deleteBudget.isPending}><Trash2 /></Button></div>
                  </div>
                  <Progress value={Math.min(percentage, 100)} indicatorClassName={tone} className="mt-5" />
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{percentage.toFixed(0)}% utilizado</span><span>{spent > limit ? "Limite ultrapassado" : "Restante: "}<MoneyDisplay value={Math.max(limit - spent, 0)} /></span></div>
                  {percentage >= 80 ? <p className={`mt-4 flex items-center gap-2 text-sm ${percentage >= 100 ? "text-destructive" : "text-warning"}`}><TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />{percentage >= 100 ? "Você ultrapassou este orçamento." : percentage >= 90 ? "Atenção: você já utilizou 90% deste orçamento." : "Atenção: você já utilizou 80% deste orçamento."}</p> : null}
                </article>
              );
            })}
          </section>
        </>
      ) : (
        <EmptyState icon={WalletCards} title="Nenhum orçamento neste mês" description="Crie um limite por categoria para acompanhar seus gastos sem planilhas." action={<Button onClick={() => setFormOpen(true)}>Criar primeiro orçamento</Button>} />
      )}

      <BudgetFormDialog open={formOpen} onOpenChange={setFormOpen} budget={editing} categories={categories.data ?? []} periodStart={currentPeriod} />
    </div>
  );
}
