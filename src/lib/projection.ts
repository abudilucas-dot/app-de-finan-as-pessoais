import type { CreditCardInvoice } from "@/lib/creditCards";
import type { DebtSummary } from "@/lib/debts";
import type { RecurringRule } from "@/lib/recurringRules";
import type { FinancialTransaction } from "@/lib/transactions";

export type ProjectionEventKind = "pending" | "recurring" | "invoice" | "debt";

export type ProjectionEvent = {
  id: string;
  date: string;
  label: string;
  amount: number;
  kind: ProjectionEventKind;
};

export type CashProjection = {
  endDate: string;
  projectedBalance: number;
  expectedIncome: number;
  expectedOutflow: number;
  lowestBalance: number;
  lowestBalanceDate: string | null;
  events: ProjectionEvent[];
};

function toLocalDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number) {
  const date = toLocalDate(value);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function nextRecurringDate(value: string, frequency: RecurringRule["frequency"]) {
  const date = toLocalDate(value);
  const months = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 } as const;

  if (frequency === "weekly") date.setDate(date.getDate() + 7);
  else if (frequency === "biweekly") date.setDate(date.getDate() + 14);
  else date.setMonth(date.getMonth() + months[frequency]);

  return toDateKey(date);
}

function dateForProjection(value: string, today: string) {
  return value < today ? today : value;
}

function recurringEvents(rule: RecurringRule, today: string, endDate: string) {
  const events: ProjectionEvent[] = [];
  let date = rule.next_occurrence;

  if (rule.end_date && date > rule.end_date) return events;

  if (date < today) {
    events.push({
      id: `recurring:${rule.id}:overdue`,
      date: today,
      label: rule.description,
      amount: rule.type === "income" ? Number(rule.amount) : -Number(rule.amount),
      kind: "recurring",
    });

    while (date < today) date = nextRecurringDate(date, rule.frequency);
  }

  while (date <= endDate && (!rule.end_date || date <= rule.end_date)) {
    events.push({
      id: `recurring:${rule.id}:${date}`,
      date,
      label: rule.description,
      amount: rule.type === "income" ? Number(rule.amount) : -Number(rule.amount),
      kind: "recurring",
    });
    date = nextRecurringDate(date, rule.frequency);
  }

  return events;
}

export function buildCashProjection({
  currentBalance,
  today,
  days,
  transactions,
  recurringRules,
  invoices,
  debts,
}: {
  currentBalance: number;
  today: string;
  days: number;
  transactions: FinancialTransaction[];
  recurringRules: RecurringRule[];
  invoices: CreditCardInvoice[];
  debts: DebtSummary[];
}): CashProjection {
  const endDate = addDays(today, days);
  const events: ProjectionEvent[] = [];

  for (const transaction of transactions) {
    if (transaction.status !== "pending" && transaction.status !== "overdue") continue;
    if (transaction.type === "transfer") continue;
    if (transaction.transaction_date > endDate) continue;

    // Compras no crédito saem do saldo somente quando a fatura é projetada.
    if (transaction.type === "expense" && transaction.credit_card_id) continue;

    events.push({
      id: `pending:${transaction.id}`,
      date: dateForProjection(transaction.transaction_date, today),
      label: transaction.description,
      amount: transaction.type === "income" ? Number(transaction.amount) : -Number(transaction.amount),
      kind: "pending",
    });
  }

  for (const rule of recurringRules) {
    if (rule.active) events.push(...recurringEvents(rule, today, endDate));
  }

  const invoiceBalances = new Map<string, number>();
  for (const transaction of transactions) {
    if (!transaction.invoice_id || transaction.status !== "confirmed") continue;
    if (transaction.type !== "expense" && transaction.type !== "card_payment") continue;
    const current = invoiceBalances.get(transaction.invoice_id) ?? 0;
    invoiceBalances.set(
      transaction.invoice_id,
      current + (transaction.type === "expense" ? Number(transaction.amount) : -Number(transaction.amount)),
    );
  }

  for (const invoice of invoices) {
    const balance = invoiceBalances.get(invoice.id) ?? 0;
    if (invoice.status === "paid" || balance <= 0.005 || invoice.due_date > endDate) continue;
    events.push({
      id: `invoice:${invoice.id}`,
      date: dateForProjection(invoice.due_date, today),
      label: "Pagamento de fatura",
      amount: -balance,
      kind: "invoice",
    });
  }

  for (const debt of debts) {
    if (debt.status !== "active" || !debt.next_due_date || !debt.installment_amount) continue;
    if (debt.next_due_date > endDate) continue;
    events.push({
      id: `debt:${debt.id}:${debt.next_due_date}`,
      date: dateForProjection(debt.next_due_date, today),
      label: `Parcela: ${debt.name}`,
      amount: -Math.min(Number(debt.installment_amount), Number(debt.remaining_amount)),
      kind: "debt",
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  let runningBalance = currentBalance;
  let lowestBalance = currentBalance;
  let lowestBalanceDate: string | null = null;
  let expectedIncome = 0;
  let expectedOutflow = 0;

  for (const event of events) {
    runningBalance += event.amount;
    if (event.amount >= 0) expectedIncome += event.amount;
    else expectedOutflow += Math.abs(event.amount);

    if (runningBalance < lowestBalance) {
      lowestBalance = runningBalance;
      lowestBalanceDate = event.date;
    }
  }

  return {
    endDate,
    projectedBalance: runningBalance,
    expectedIncome,
    expectedOutflow,
    lowestBalance,
    lowestBalanceDate,
    events,
  };
}
