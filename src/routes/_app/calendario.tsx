import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Pencil,
  Plus,
  Repeat2,
  Trash2,
} from "lucide-react";
import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { RecurringRuleFormDialog } from "@/components/app/RecurringRuleFormDialog";
import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { brand } from "@/config/brand";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useCompleteRecurringRule, useDeleteRecurringRule, useRecurringRules } from "@/hooks/useRecurringRules";
import {
  formatScheduledDate,
  type RecurringFrequency,
  type RecurringRule,
  recurringFrequencyLabels,
  todayDate,
} from "@/lib/recurringRules";

type ScheduledOccurrence = {
  date: string;
  rule: RecurringRule;
};

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function dateFromValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function nextOccurrence(date: Date, frequency: RecurringFrequency) {
  switch (frequency) {
    case "weekly":
      return addDays(date, 7);
    case "biweekly":
      return addDays(date, 14);
    case "monthly":
      return addMonths(date, 1);
    case "quarterly":
      return addMonths(date, 3);
    case "semiannual":
      return addMonths(date, 6);
    case "annual":
      return addYears(date, 1);
  }
}

function occurrencesInMonth(rule: RecurringRule, monthStart: Date, monthEnd: Date): ScheduledOccurrence[] {
  const result: ScheduledOccurrence[] = [];
  const limit = rule.end_date ? dateFromValue(rule.end_date) : null;
  let occurrence = dateFromValue(rule.next_occurrence);
  let guard = 0;

  while (isBefore(occurrence, monthStart) && (!limit || !isAfter(occurrence, limit)) && guard < 800) {
    occurrence = nextOccurrence(occurrence, rule.frequency);
    guard += 1;
  }

  while (!isAfter(occurrence, monthEnd) && (!limit || !isAfter(occurrence, limit)) && guard < 800) {
    result.push({ date: dateKey(occurrence), rule });
    occurrence = nextOccurrence(occurrence, rule.frequency);
    guard += 1;
  }

  return result;
}

function monthLabel(date: Date) {
  const label = format(date, "MMMM yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

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
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const accountNames = useMemo(
    () => new Map((accounts.data ?? []).map((account) => [account.id, account.name])),
    [accounts.data],
  );
  const categoryNames = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category.name])),
    [categories.data],
  );

  const calendarRange = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    const firstDay = startOfWeek(monthStart, { weekStartsOn: 0 });
    const lastDay = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const count = differenceInCalendarDays(lastDay, firstDay) + 1;

    return {
      monthStart,
      monthEnd,
      days: Array.from({ length: count }, (_, index) => addDays(firstDay, index)),
    };
  }, [visibleMonth]);

  const items = rules.data ?? [];

  const occurrencesByDate = useMemo(() => {
    const grouped = new Map<string, ScheduledOccurrence[]>();

    for (const rule of items) {
      for (const occurrence of occurrencesInMonth(rule, calendarRange.monthStart, calendarRange.monthEnd)) {
        grouped.set(occurrence.date, [...(grouped.get(occurrence.date) ?? []), occurrence]);
      }
    }

    return grouped;
  }, [calendarRange.monthEnd, calendarRange.monthStart, items]);

  const selectedOccurrences = selectedDate ? occurrencesByDate.get(dateKey(selectedDate)) ?? [] : [];
  const isCurrentMonth = isSameMonth(visibleMonth, new Date());

  if (rules.isLoading || accounts.isLoading || categories.isLoading) {
    return <LoadingState label="Carregando seu calendário financeiro..." />;
  }
  if (rules.isError || accounts.isError || categories.isError) {
    return <ErrorState onRetry={() => { rules.refetch(); accounts.refetch(); categories.refetch(); }} />;
  }

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

  const openNewProgramming = () => {
    setEditingRule(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Calendário financeiro"
        description="Veja suas programações no mês e toque em um dia para abrir todos os detalhes."
        actions={<Button onClick={openNewProgramming}><Plus aria-hidden="true" />Nova programação</Button>}
      />

      <section className="surface flex gap-3 p-4 text-sm text-muted-foreground">
        <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <p>Itens programados não alteram saldo, orçamento ou relatórios até você confirmar o pagamento ou recebimento.</p>
      </section>

      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-lg font-semibold">Programações do mês</h2>
            <p className="text-sm text-muted-foreground">Dias com pontos possuem uma ou mais programações.</p>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="icon"
              aria-label="Mês anterior"
              onClick={() => setVisibleMonth((month) => startOfMonth(subMonths(month, 1)))}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <p className="min-w-40 text-center font-semibold capitalize">{monthLabel(visibleMonth)}</p>
            <Button
              variant="outline"
              size="icon"
              aria-label="Próximo mês"
              onClick={() => setVisibleMonth((month) => startOfMonth(addMonths(month, 1)))}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            {!isCurrentMonth && <Button variant="ghost" size="sm" onClick={() => setVisibleMonth(startOfMonth(new Date()))}>Hoje</Button>}
          </div>
        </div>

        <div className="p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:gap-2 sm:text-xs">
            {weekDays.map((weekDay) => <span key={weekDay}>{weekDay}</span>)}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarRange.days.map((day) => {
              const key = dateKey(day);
              const occurrences = occurrencesByDate.get(key) ?? [];
              const outsideMonth = !isSameMonth(day, visibleMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={[
                    "min-h-20 rounded-lg border p-1 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-28 sm:p-2",
                    outsideMonth ? "border-transparent bg-muted/25 text-muted-foreground/50" : "border-border bg-card hover:border-primary/60 hover:bg-primary/5",
                    isToday ? "ring-1 ring-primary" : "",
                    occurrences.length ? "border-primary/45 bg-primary/5" : "",
                  ].join(" ")}
                  aria-label={`${format(day, "d 'de' MMMM", { locale: ptBR })}: ${occurrences.length ? `${occurrences.length} programação(ões)` : "nenhuma programação"}`}
                >
                  <span className={[\"grid size-6 place-items-center rounded-full text-xs font-semibold sm:size-7 sm:text-sm\", isToday ? "bg-primary text-primary-foreground" : ""].join(" ")}>
                    {format(day, "d")}
                  </span>

                  {occurrences.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {occurrences.slice(0, 2).map((occurrence) => (
                        <div key={`${occurrence.rule.id}-${occurrence.date}`} className="flex items-center gap-1">
                          <span className={`size-1.5 shrink-0 rounded-full ${occurrence.rule.type === "expense" ? "bg-destructive" : "bg-positive"}`} aria-hidden="true" />
                          <span className="hidden truncate text-[10px] font-medium sm:block">{occurrence.rule.description}</span>
                        </div>
                      ))}
                      {occurrences.length > 2 && <span className="text-[10px] font-semibold text-primary">+${occurrences.length - 2}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {!items.length && (
        <EmptyState
          icon={CalendarDays}
          title="Nenhuma programação cadastrada"
          description="Crie uma programação para ela aparecer no dia correspondente do calendário."
          action={<Button onClick={openNewProgramming}>Criar primeira programação</Button>}
        />
      )}

      <Dialog open={selectedDate !== null} onOpenChange={(open) => { if (!open) setSelectedDate(null); }}>
        <DialogContent className="left-0 top-0 h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0 bg-background p-0 sm:rounded-none">
          {selectedDate && (
            <div className="mx-auto min-h-full max-w-3xl px-5 py-8 pb-28 sm:px-8">
              <DialogHeader className="pr-12 text-left">
                <DialogTitle className="text-2xl sm:text-3xl">Programações de {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}</DialogTitle>
                <DialogDescription>
                  {selectedOccurrences.length === 1
                    ? "1 programação encontrada para este dia."
                    : `${selectedOccurrences.length} programações encontradas para este dia.`}
                </DialogDescription>
              </DialogHeader>

              {selectedOccurrences.length ? (
                <div className="mt-8 space-y-4">
                  {selectedOccurrences.map((occurrence) => {
                    const { rule } = occurrence;
                    const canComplete = occurrence.date === rule.next_occurrence;

                    return (
                      <article key={`${rule.id}-${occurrence.date}`} className="surface space-y-5 p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${rule.type === "expense" ? "bg-destructive/10 text-destructive" : "bg-positive/10 text-positive"}`}>
                              {rule.type === "expense" ? <CircleDollarSign className="size-5" aria-hidden="true" /> : <Repeat2 className="size-5" aria-hidden="true" />}
                            </div>
                            <div className="min-w-0">
                              <h3 className="break-words text-lg font-semibold">{rule.description}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {recurringFrequencyLabels[rule.frequency]} · {rule.type === "expense" ? "Despesa" : "Receita"}
                                {rule.is_subscription ? " · Assinatura" : ""}
                              </p>
                            </div>
                          </div>
                          <MoneyDisplay value={rule.amount} className={`shrink-0 text-lg font-semibold ${rule.type === "expense" ? "text-destructive" : "text-positive"}`} />
                        </div>

                        <dl className="grid gap-4 border-y border-border py-4 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-muted-foreground">Conta</dt>
                            <dd className="mt-1 font-medium">{accountNames.get(rule.account_id) ?? "Conta indisponível"}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Categoria</dt>
                            <dd className="mt-1 font-medium">{rule.category_id ? categoryNames.get(rule.category_id) ?? "Categoria indisponível" : "Sem categoria"}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Ocorrência</dt>
                            <dd className="mt-1 font-medium">{formatScheduledDate(occurrence.date)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Próxima confirmação</dt>
                            <dd className="mt-1 font-medium">{formatScheduledDate(rule.next_occurrence)}</dd>
                          </div>
                        </dl>

                        {rule.notes && <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{rule.notes}</p>}

                        {canComplete ? (
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => { void complete(rule); }} disabled={completeRule.isPending}>
                              <CheckCircle2 aria-hidden="true" />{rule.type === "expense" ? "Marcar como paga" : "Marcar como recebida"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setEditingRule(rule); setSelectedDate(null); setFormOpen(true); }}>
                              <Pencil aria-hidden="true" />Editar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { void removeRule(rule); }} disabled={deleteRule.isPending}>
                              <Trash2 aria-hidden="true" />Remover
                            </Button>
                          </div>
                        ) : (
                          <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                            Esta é uma repetição futura. Ela poderá ser confirmada após a ocorrência de {formatScheduledDate(rule.next_occurrence)}.
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-12 flex flex-col items-center rounded-2xl border border-dashed border-border p-8 text-center">
                  <CalendarDays className="size-10 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhuma programação neste dia</h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">Crie uma programação e ela aparecerá no dia correspondente deste calendário.</p>
                  <Button className="mt-5" onClick={() => { setSelectedDate(null); openNewProgramming(); }}>
                    <Plus aria-hidden="true" />Nova programação
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
