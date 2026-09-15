import { CalendarClock, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { Button } from "@/components/ui/button";
import type { CreditCardInvoice } from "@/lib/creditCards";
import type { DebtSummary } from "@/lib/debts";
import { buildCashProjection, type ProjectionEventKind } from "@/lib/projection";
import type { RecurringRule } from "@/lib/recurringRules";
import { formatTransactionDate, localToday, type FinancialTransaction } from "@/lib/transactions";
import { cn } from "@/lib/utils";

const labels: Record<ProjectionEventKind, string> = {
  pending: "Pendente",
  recurring: "Recorrência",
  invoice: "Fatura",
  debt: "Dívida",
};

export function BalanceProjection({
  currentBalance,
  transactions,
  recurringRules,
  invoices,
  debts,
}: {
  currentBalance: number;
  transactions: FinancialTransaction[];
  recurringRules: RecurringRule[];
  invoices: CreditCardInvoice[];
  debts: DebtSummary[];
}) {
  const [days, setDays] = useState<7 | 15 | 30>(30);
  const projection = useMemo(
    () =>
      buildCashProjection({
        currentBalance,
        today: localToday(),
        days,
        transactions,
        recurringRules,
        invoices,
        debts,
      }),
    [currentBalance, days, debts, invoices, recurringRules, transactions],
  );

  const hasRisk = projection.lowestBalance < 0;

  return (
    <section className="surface overflow-hidden" aria-label="Projeção de saldo">
      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold tracking-tight">Projeção de saldo</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Estimativa até {formatTransactionDate(projection.endDate)}, usando dados já cadastrados.
          </p>
        </div>
        <div className="flex rounded-lg bg-muted p-1" aria-label="Período da projeção">
          {([7, 15, 30] as const).map((option) => (
            <Button
              key={option}
              type="button"
              variant={days === option ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDays(option)}
              aria-pressed={days === option}
            >
              {option} dias
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
        <div>
          <p className="text-sm text-muted-foreground">Saldo estimado</p>
          <MoneyDisplay
            value={projection.projectedBalance}
            signed
            className={cn(
              "mt-1 block text-2xl font-semibold tracking-tight",
              projection.projectedBalance < 0 && "text-negative",
            )}
          />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Entradas previstas</p>
          <MoneyDisplay value={projection.expectedIncome} className="mt-1 block text-xl font-semibold text-positive" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Saídas previstas</p>
          <MoneyDisplay value={projection.expectedOutflow} className="mt-1 block text-xl font-semibold text-negative" />
        </div>
      </div>

      {hasRisk ? (
        <div className="mx-5 mb-5 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:mx-6 sm:mb-6">
          <TrendingDown className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <p>
            <span className="font-semibold">Atenção:</span> a projeção fica negativa em {projection.lowestBalanceDate ? formatTransactionDate(projection.lowestBalanceDate) : "breve"}.
          </p>
        </div>
      ) : (
        <div className="mx-5 mb-5 flex gap-3 rounded-xl bg-primary/8 p-4 text-sm sm:mx-6 sm:mb-6">
          <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p>Com os compromissos previstos, seu saldo permanece positivo neste período.</p>
        </div>
      )}

      {projection.events.length ? (
        <div className="border-t px-5 py-4 sm:px-6">
          <h3 className="text-sm font-semibold">Próximos impactos</h3>
          <div className="mt-2 divide-y">
            {projection.events.slice(0, 4).map((event) => (
              <div key={event.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{event.label}</span>
                  <span className="block text-xs text-muted-foreground">{labels[event.kind]} · {formatTransactionDate(event.date)}</span>
                </span>
                <MoneyDisplay
                  value={event.amount}
                  signed
                  className={cn("text-sm font-semibold", event.amount < 0 ? "text-negative" : "text-positive")}
                />
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="border-t px-5 py-4 text-sm text-muted-foreground sm:px-6">
          Nenhum lançamento futuro previsto. Cadastre recorrências, faturas ou vencimentos para uma estimativa mais completa.
        </p>
      )}

      <p className="border-t px-5 py-3 text-xs text-muted-foreground sm:px-6">
        Não inclui compras futuras sem data definida. Compras no cartão entram quando a fatura vence.
      </p>
    </section>
  );
}
