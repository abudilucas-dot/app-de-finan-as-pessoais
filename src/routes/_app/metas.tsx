import { createFileRoute } from "@tanstack/react-router";
import { Plus, Target, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { GoalCard } from "@/components/app/GoalCard";
import { GoalContributionDialog } from "@/components/app/GoalContributionDialog";
import { GoalFormDialog } from "@/components/app/GoalFormDialog";
import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { moduleThemes } from "@/config/moduleThemes";
import { useAccounts } from "@/hooks/useAccounts";
import { useDeleteGoal, useGoalSummaries } from "@/hooks/useGoals";
import type { GoalContribution, GoalSummary } from "@/lib/goals";

export const Route = createFileRoute("/_app/metas")({
  head: () => ({ meta: [{ title: `Metas — ${brand.name}` }] }),
  component: GoalsPage,
});

function GoalsPage() {
  const goals = useGoalSummaries();
  const accounts = useAccounts();
  const deleteGoal = useDeleteGoal();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalSummary | null>(null);
  const [contributionGoal, setContributionGoal] = useState<GoalSummary | null>(null);
  const [editingContribution, setEditingContribution] = useState<GoalContribution | null>(null);

  const accountNames = useMemo(
    () => new Map((accounts.data ?? []).map((account) => [account.id, account.name])),
    [accounts.data],
  );

  if (goals.isLoading || accounts.isLoading) return <LoadingState label="Carregando suas metas..." />;
  if (goals.isError || accounts.isError) return <ErrorState onRetry={() => { goals.refetch(); accounts.refetch(); }} />;

  const items = goals.data ?? [];
  const totalTarget = items.reduce((sum, goal) => sum + Number(goal.target_amount), 0);
  const totalSaved = items.reduce((sum, goal) => sum + Number(goal.current_amount), 0);

  const theme = moduleThemes.goals;

  const removeGoal = async (goal: GoalSummary) => {
    if (!window.confirm(`Remover a meta “${goal.name}” e todo o seu histórico de aportes?`)) return;
    try {
      await deleteGoal.mutateAsync(goal.id);
      toast.success("Meta removida.");
    } catch {
      toast.error("Não foi possível remover a meta.");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Metas"
        description="Transforme planos em objetivos claros e acompanhe cada aporte."
        actions={<Button className={theme.primary} onClick={() => { setEditingGoal(null); setFormOpen(true); }}><Plus aria-hidden="true" />Nova meta</Button>}
      />

      {items.length ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <article className={`surface border p-5 ${theme.card}`}><p className="text-sm text-muted-foreground">Valor-alvo total</p><MoneyDisplay value={totalTarget} className={`mt-2 block text-2xl font-semibold ${theme.text}`} /></article>
            <article className="surface border border-emerald-500/25 bg-gradient-to-br from-emerald-500/12 via-teal-500/5 to-transparent p-5"><p className="text-sm text-muted-foreground">Já reservado</p><MoneyDisplay value={totalSaved} className="mt-2 block text-2xl font-semibold text-positive" /></article>
          </section>
          <section className="grid gap-4 xl:grid-cols-2">
            {items.map((goal) => <GoalCard key={goal.id} goal={goal} accountNames={accountNames} onEdit={(selected) => { setEditingGoal(selected); setFormOpen(true); }} onAddContribution={(goal) => { setEditingContribution(null); setContributionGoal(goal); }} onDelete={removeGoal} onEditContribution={(goal, contribution) => { setEditingContribution(contribution); setContributionGoal(goal); }} />)}
          </section>
        </>
      ) : (
        <EmptyState icon={Target} title="Nenhuma meta criada" description="Crie um objetivo para acompanhar o que você está construindo." action={<Button className={theme.primary} onClick={() => setFormOpen(true)}>Criar primeira meta</Button>} />
      )}

      <GoalFormDialog open={formOpen} onOpenChange={setFormOpen} goal={editingGoal} />
      <GoalContributionDialog open={Boolean(contributionGoal)} onOpenChange={(open) => { if (!open) { setContributionGoal(null); setEditingContribution(null); } }} goal={contributionGoal} contribution={editingContribution} accounts={accounts.data ?? []} />
    </div>
  );
}
