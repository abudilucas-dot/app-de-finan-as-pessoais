import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, CirclePause, CirclePlay, Pencil, Plus, Repeat2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { PageHeader } from "@/components/app/PageHeader";
import { RecurringRuleFormDialog } from "@/components/app/RecurringRuleFormDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { moduleThemes } from "@/config/moduleThemes";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import {
  useCompleteRecurringRule,
  useDeleteRecurringRule,
  useSetRecurringRuleActive,
  useSubscriptions,
} from "@/hooks/useRecurringRules";
import {
  formatScheduledDate,
  monthlyEquivalent,
  type RecurringRule,
  recurringFrequencyLabels,
  todayDate,
} from "@/lib/recurringRules";

export const Route = createFileRoute("/_app/assinaturas")({
  head: () => ({ meta: [{ title: `Assinaturas — ${brand.name}` }] }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const subscriptions = useSubscriptions();
  const accounts = useAccounts();
  const categories = useCategories("expense");
  const completeRule = useCompleteRecurringRule();
  const deleteRule = useDeleteRecurringRule();
  const setActive = useSetRecurringRuleActive();
  const [formOpen, setFormOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<RecurringRule | null>(null);

  const accountNames = useMemo(
    () => new Map((accounts.data ?? []).map((account) => [account.id, account.name])),
    [accounts.data],
  );

  if (subscriptions.isLoading || accounts.isLoading || categories.isLoading) {
    return <LoadingState label="Carregando suas assinaturas..." />;
  }
  if (subscriptions.isError || accounts.isError || categories.isError) {
    return <ErrorState onRetry={() => { subscriptions.refetch(); accounts.refetch(); categories.refetch(); }} />;
  }

  const items = subscriptions.data ?? [];
  const activeItems = items.filter((item) => item.active);
  const monthlyTotal = activeItems.reduce(
    (total, item) => total + monthlyEquivalent(Number(item.amount), item.frequency),
    0,
  );
  const nextCharge = activeItems
    .map((item) => item.next_occurrence)
    .sort((a, b) => a.localeCompare(b))[0];

  const theme = moduleThemes.subscriptions;

  const complete = async (rule: RecurringRule) => {
    if (!window.confirm(`Marcar a cobrança de “${rule.description}” como paga? Isso criará uma despesa e atualizará seu saldo.`)) return;
    try {
      await completeRule.mutateAsync({
        ruleId: rule.id,
        expectedOccurrence: rule.next_occurrence,
        transactionDate: todayDate(),
      });
      toast.success("Cobrança registrada como paga.");
    } catch {
      toast.error("Não foi possível registrar a cobrança.");
    }
  };

  const pauseOrResume = async (rule: RecurringRule) => {
    const action = rule.active ? "pausar" : "retomar";
    if (!window.confirm(`${rule.active ? "Pausar" : "Retomar"} “${rule.description}”? ${rule.active ? "Ela deixará de aparecer na projeção e nos avisos." : "Ela voltará a aparecer na projeção e nos avisos."}`)) return;
    try {
      await setActive.mutateAsync({ id: rule.id, active: !rule.active });
      toast.success(rule.active ? "Assinatura pausada." : "Assinatura retomada.");
    } catch {
      toast.error(`Não foi possível ${action} a assinatura.`);
    }
  };

  const remove = async (rule: RecurringRule) => {
    if (!window.confirm(`Remover “${rule.description}”? As cobranças já confirmadas continuarão no histórico.`)) return;
    try {
      await deleteRule.mutateAsync(rule.id);
      toast.success("Assinatura removida.");
    } catch {
      toast.error("Não foi possível remover a assinatura.");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assinaturas"
        description="Acompanhe seus serviços recorrentes sem esquecer nenhuma cobrança."
        actions={<Button className={theme.primary} onClick={() => { setEditingSubscription(null); setFormOpen(true); }}><Plus aria-hidden="true" />Nova assinatura</Button>}
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <article className={`surface border p-5 ${theme.card}`}>
          <p className="text-sm text-muted-foreground">Total mensal estimado</p>
          <MoneyDisplay value={monthlyTotal} className="mt-2 block text-2xl font-semibold text-negative" />
          <p className="mt-2 text-xs text-muted-foreground">Considera somente assinaturas ativas.</p>
        </article>
        <article className="surface border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 via-pink-500/5 to-transparent p-5">
          <p className="text-sm text-muted-foreground">Próxima cobrança</p>
          <p className="mt-2 text-2xl font-semibold">{nextCharge ? formatScheduledDate(nextCharge) : "Nenhuma"}</p>
          <p className="mt-2 text-xs text-muted-foreground">{activeItems.length} {activeItems.length === 1 ? "assinatura ativa" : "assinaturas ativas"}.</p>
        </article>
      </section>

      {items.length ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {items.map((subscription) => (
            <article key={subscription.id} className={`surface flex flex-col gap-5 border p-5 ${theme.card}`}>
              <div className="flex gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pink-500/15 text-pink-700 dark:text-pink-300">
                  <Repeat2 className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-semibold">{subscription.description}</h2>
                    <span className={subscription.active ? "rounded-full bg-positive/10 px-2 py-0.5 text-xs font-medium text-positive" : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"}>
                      {subscription.active ? "Ativa" : "Pausada"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {recurringFrequencyLabels[subscription.frequency]} · {accountNames.get(subscription.account_id) ?? "Conta indisponível"}
                  </p>
                </div>
                <MoneyDisplay value={subscription.amount} className="shrink-0 text-lg font-semibold text-negative" />
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-3 text-sm">
                <CalendarClock className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1">Próxima cobrança: {formatScheduledDate(subscription.next_occurrence)}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {subscription.active ? (
                  <Button className={theme.primary} size="sm" onClick={() => complete(subscription)} disabled={completeRule.isPending}>
                    Marcar como paga
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" onClick={() => pauseOrResume(subscription)} disabled={setActive.isPending}>
                  {subscription.active ? <CirclePause aria-hidden="true" /> : <CirclePlay aria-hidden="true" />}
                  {subscription.active ? "Pausar" : "Retomar"}
                </Button>
                <Button size="icon" variant="outline" aria-label={`Editar ${subscription.description}`} onClick={() => { setEditingSubscription(subscription); setFormOpen(true); }}>
                  <Pencil aria-hidden="true" />
                </Button>
                <Button size="icon" variant="outline" aria-label={`Remover ${subscription.description}`} onClick={() => remove(subscription)} disabled={deleteRule.isPending}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          icon={Repeat2}
          title="Nenhuma assinatura cadastrada"
          description="Cadastre serviços como streaming, academia, internet ou apps pagos para acompanhar o impacto mensal."
          action={<Button className={theme.primary} onClick={() => setFormOpen(true)}>Cadastrar primeira assinatura</Button>}
        />
      )}

      <RecurringRuleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        rule={editingSubscription}
        accounts={accounts.data ?? []}
        categories={categories.data ?? []}
        mode="subscription"
      />
    </div>
  );
}
