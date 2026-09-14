import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDeleteGoalContribution, useGoalContributions } from "@/hooks/useGoals";
import { formatGoalDate, goalProgress, remainingGoalAmount, type GoalSummary } from "@/lib/goals";

export function GoalCard({
  goal,
  accountNames,
  onEdit,
  onAddContribution,
  onDelete,
}: {
  goal: GoalSummary;
  accountNames: Map<string, string>;
  onEdit: (goal: GoalSummary) => void;
  onAddContribution: (goal: GoalSummary) => void;
  onDelete: (goal: GoalSummary) => void;
}) {
  const contributions = useGoalContributions(goal.id);
  const deleteContribution = useDeleteGoalContribution();
  const current = Number(goal.current_amount);
  const target = Number(goal.target_amount);
  const percentage = goalProgress(current, target);
  const completed = percentage >= 100;

  const removeContribution = async (id: string) => {
    if (!window.confirm("Remover este aporte da meta?")) return;
    try {
      await deleteContribution.mutateAsync(id);
      toast.success("Aporte removido.");
    } catch {
      toast.error("Não foi possível remover o aporte.");
    }
  };

  return (
    <article className="surface overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: goal.color ?? "#0F766E" }} aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{goal.name}</h2>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{formatGoalDate(goal.target_date)}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" aria-label="Editar meta" onClick={() => onEdit(goal)}><Pencil /></Button>
          <Button variant="ghost" size="icon" aria-label="Remover meta" onClick={() => onDelete(goal)}><Trash2 /></Button>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div><MoneyDisplay value={current} className="text-2xl font-semibold" /><span className="text-sm text-muted-foreground"> de <MoneyDisplay value={target} /></span></div>
        <span className={completed ? "text-sm font-medium text-positive" : "text-sm text-muted-foreground"}>{completed ? "Meta alcançada 🎉" : `${percentage.toFixed(0)}%`}</span>
      </div>
      <Progress value={Math.min(percentage, 100)} className="mt-3" indicatorClassName={completed ? "bg-positive" : undefined} />
      <p className="mt-2 text-xs text-muted-foreground">{completed ? "Parabéns, você chegou ao valor-alvo." : <>Faltam <MoneyDisplay value={remainingGoalAmount(current, target)} /> para alcançar.</>}</p>

      <Button className="mt-5 w-full" variant="outline" onClick={() => onAddContribution(goal)}><Plus aria-hidden="true" />Adicionar aporte</Button>

      <div className="mt-5 border-t pt-4">
        <p className="text-sm font-medium">Últimos aportes</p>
        {contributions.isLoading ? <p className="mt-2 text-sm text-muted-foreground">Carregando histórico...</p> : null}
        {!contributions.isLoading && !(contributions.data?.length) ? <p className="mt-2 text-sm text-muted-foreground">Nenhum aporte registrado ainda.</p> : null}
        <ul className="mt-2 divide-y">
          {(contributions.data ?? []).slice(0, 3).map((contribution) => (
            <li key={contribution.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0 text-sm">
                <p className="font-medium"><MoneyDisplay value={contribution.amount} /></p>
                <p className="truncate text-xs text-muted-foreground">{formatGoalDate(contribution.contribution_date)}{contribution.account_id ? ` · ${accountNames.get(contribution.account_id) ?? "Conta"}` : ""}{contribution.notes ? ` · ${contribution.notes}` : ""}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Remover aporte" className="h-8 w-8" disabled={deleteContribution.isPending} onClick={() => removeContribution(contribution.id)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
