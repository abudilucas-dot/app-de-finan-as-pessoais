import type { FinancialTransaction } from "@/lib/transactions";

export type ReportPeriod = "month" | "three_months" | "six_months" | "year" | "all";

export const reportPeriodLabels: Record<ReportPeriod, string> = {
  month: "Este mês",
  three_months: "Últimos 3 meses",
  six_months: "Últimos 6 meses",
  year: "Este ano",
  all: "Todo o período",
};

export type ReportSummary = { income: number; expense: number };

export type ReportComparison = {
  previous: ReportSummary;
  label: string;
} | null;

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthStart(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function monthEnd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
  ).padStart(2, "0")}`;
}

export function reportStartDate(period: ReportPeriod, now = new Date()) {
  if (period === "all") return null;
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "three_months") start.setMonth(start.getMonth() - 2);
  if (period === "six_months") start.setMonth(start.getMonth() - 5);
  if (period === "year") start.setMonth(0);
  return monthStart(start);
}

function previousReportRange(period: ReportPeriod, now = new Date()) {
  if (period === "all") return null;

  if (period === "year") {
    const previousYear = now.getFullYear() - 1;
    return { start: `${previousYear}-01-01`, end: `${previousYear}-12-31`, label: "ano anterior" };
  }

  const months = period === "month" ? 1 : period === "three_months" ? 3 : 6;
  const currentStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const previousStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - months, 1);
  const previousEnd = new Date(currentStart.getFullYear(), currentStart.getMonth(), 0);

  return {
    start: monthStart(previousStart),
    end: monthEnd(previousEnd),
    label: months === 1 ? "mês anterior" : "período anterior",
  };
}

function belongsToAccount(transaction: FinancialTransaction, accountId: string) {
  return accountId === "all" || transaction.account_id === accountId;
}

export function filterReportTransactions(
  transactions: FinancialTransaction[],
  period: ReportPeriod,
  accountId: string,
) {
  const start = reportStartDate(period);
  const today = localDateString();

  return transactions.filter((transaction) => {
    if (transaction.status !== "confirmed") return false;
    if (transaction.transaction_date > today) return false;
    if (start && transaction.transaction_date < start) return false;
    return belongsToAccount(transaction, accountId);
  });
}

export function reportSummary(transactions: FinancialTransaction[]): ReportSummary {
  return transactions.reduce(
    (summary, transaction) => {
      if (transaction.type === "income") summary.income += Number(transaction.amount);
      if (transaction.type === "expense") summary.expense += Number(transaction.amount);
      return summary;
    },
    { income: 0, expense: 0 },
  );
}

export function previousReportComparison(
  transactions: FinancialTransaction[],
  period: ReportPeriod,
  accountId: string,
  now = new Date(),
): ReportComparison {
  const range = previousReportRange(period, now);
  if (!range) return null;

  return {
    label: range.label,
    previous: reportSummary(
      transactions.filter(
        (transaction) =>
          transaction.status === "confirmed" &&
          transaction.transaction_date >= range.start &&
          transaction.transaction_date <= range.end &&
          belongsToAccount(transaction, accountId),
      ),
    ),
  };
}

export function percentageChange(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function monthlyReportData(transactions: FinancialTransaction[], period: ReportPeriod) {
  const rows = new Map<string, { month: string; income: number; expense: number }>();
  const now = new Date();
  const start = reportStartDate(period);
  const firstMonth = start ? new Date(`${start}T12:00:00`) : null;

  if (firstMonth) {
    const cursor = new Date(firstMonth.getFullYear(), firstMonth.getMonth(), 1);
    while (cursor <= now) {
      const key = monthStart(cursor).slice(0, 7);
      rows.set(key, {
        month: new Intl.DateTimeFormat("pt-BR", { month: "short" })
          .format(cursor)
          .replace(".", ""),
        income: 0,
        expense: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  for (const transaction of transactions) {
    if (transaction.type !== "income" && transaction.type !== "expense") continue;
    const key = transaction.transaction_date.slice(0, 7);
    if (!rows.has(key)) {
      const date = new Date(`${key}-01T12:00:00`);
      rows.set(key, {
        month: new Intl.DateTimeFormat("pt-BR", { month: "short" })
          .format(date)
          .replace(".", ""),
        income: 0,
        expense: 0,
      });
    }
    const row = rows.get(key)!;
    if (transaction.type === "income") row.income += Number(transaction.amount);
    else row.expense += Number(transaction.amount);
  }

  return [...rows.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-12)
    .map(([, value]) => value);
}

export function expenseCategoryData(
  transactions: FinancialTransaction[],
  categoryNames: Map<string, string>,
) {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    const category = transaction.category_id
      ? categoryNames.get(transaction.category_id) ?? "Sem categoria"
      : "Sem categoria";
    totals.set(category, (totals.get(category) ?? 0) + Number(transaction.amount));
  }

  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value, percentage: total > 0 ? (value / total) * 100 : 0 }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
}
