import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, CircleDollarSign, Pencil, Plus, Repeat2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { RecurringRuleFormDialog } from "@/components/app/RecurringRuleFormDialog";
import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useCompleteRecurringRule, useDeleteRecurringRule, useRecurringRules } from "@/hooks/useRecurringRules";
import { formatScheduledDate, getScheduledDateLabel, type RecurringRule, recurringFrequencyLabels, todayDate } from "@/lib/recurringRules";

export const Route = createFileRoute("/_app/calendario")({
  head: () => ({ meta: [{ title: `Calendário — ${brand.name}` }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const rules = useRecurringRules();
  const accounts = useAccounts();
  const categories = useCategories();
  const deleteRule = useDeleteRecurringRule();
  const completeRule = useCompleteRecurringRule();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);

  const accountNames = useMemo(
    () => new Map((accounts.data ?? []).map((account) => [account.id, account.name])),
    [accounts.data],
  );
  const categoryNames = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category.name])),
    [categories.data],
  );

  if (rules.isLoading || accounts.isLoading || categories.isLoading) {
    return <LoadingState label="Carregando seu calendário financeiro..." />;
  }
  if (rules.isError || accounts.isError || categories.isError) {
    return <ErrorState onRetry={() => { rules.refetch(); accounts.refetch(); categories.refetch(); }} />;
  }

  const items = rules.data ?? [];

  const removeRule = async (rule: RecurringRule) => {
    if (!window.confirm(`Remover a programação “${rule.description}”? Os lançamentos já confirmados serão preservados.`)) return;
    try {
      await deleteRule.mutateAsync(rule.id);
      toast.success("Programação removida.");
    } catch {
      toast.error("Não foi possível remover a programação.");
    }
  };

  const complete = async (rule: RecurringRule) => {
    const action = rule.type === "expense" ? "paga" : "recebida";
    if (!window.confirm(`Marcar “${rule.description}” como ${action}? Isso criará a transação e atualizará seu saldo.`)) return;

    try {
      await completeRule.mutateAsync({
        ruleId: rule.id,
        expectedOccurrence: rule.next_occurrence,
        transactionDate: todayDate(),
      });
      toast.success(rule.type === "expense" ? "Despesa marcada como paga." : "Receita marcada como recebida.");
    } catch {
      toast.error("Não foi possível confirmar este lançamento. Atualize a página e tente novamente.");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Calendário financeiro"
        description="Organize receitas e despesas recorrentes antes de elas acontecerem."
        actions={<Button onClick={() => { setEditingRule(null); setFormOpen(true); }}><Plus aria-hidden="true" />Nova programação</Button>}
      />

      <section className="surface flex gap-3 p-4 text-sm text-muted-foreground">
        <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <p>Itens programados não alteram saldo, orçamento ou relatórios até você confirmar o pagamento ou recebimento.</p>
      </section>

      {items.length ? (
        <section className="space-y-3">
          {items.map((rule) => {
            const overdue = rule.next_occurrence < todayDate();
            return (
              <article key={rule.id} className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${rule.type === "expense" ? "bg-destructive/10 text-destructive" : "bg-positive/10 text-positive"}`}>
                    {rule.type === "expense" ? <CircleDollarSign className="size-5" aria-hidden="true" /> : <Repeat2 className="size-5" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h2 className="truncate font-semibold">{rule.description}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${overdue ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>
                        {getScheduledDateLabel(rule.next_occurrence)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {recurringFrequencyLabels[rule.frequency]} · {accountNames.get(rule.account_id) ?? "Conta indisponível"}
                      {rule.category_id ? ` · ${categoryNames.get(rule.category_id) ?? "Categoria"}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Próxima data: {formatScheduledDate(rule.next_occurrence)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <MoneyDisplay value={rule.amount} className={`mr-auto text-base font-semibold sm:mr-2 ${rule.type === "expense" ? "text-destructive" : "text-positive"}`} />
                  <Button size="sm" onClick={() => complete(rule)} disabled={completeRule.isPending}>
                    <CheckCircle2 aria-hidden="true" />{rule.type === "expense" ? "Marcar como paga" : "Marcar como recebida"}
                  </Button>
                  <Button variant="outline" size="icon" aria-label={`Editar ${rule.description}`} onClick={() => { setEditingRule(rule); setFormOpen(true); }}><Pencil aria-hidden="true" /></Button>
                  <Button variant="outline" size="icon" aria-label={`Remover ${rule.description}`} onClick={() => removeRule(rule)} disabled={deleteRule.isPending}><Trash2 aria-hidden="true" /></Button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="Nenhuma conta programada"
          description="Crie uma programação para nunca perder uma receita ou despesa recorrente."
          action={<Button onClick={() => setFormOpen(true)}>Criar primeira programação</Button>}
        />
      )}

      <RecurringRuleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        rule={editingRule}
        accounts={accounts.data ?? []}
        categories={categories.data ?? []}
      />
    </div>
  );
}
