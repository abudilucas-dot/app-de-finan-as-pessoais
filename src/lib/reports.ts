import type { FinancialTransaction } from "@/lib/transactions";

export type ReportPeriod = "month" | "three_months" | "six_months" | "year" | "all";

export const reportPeriodLabels: Record<ReportPeriod, string> = {
  month: "Este mês",
  three_months: "Últimos 3 meses",
  six_months: "Últimos 6 meses",
  year: "Este ano",
  all: "Todo o período",
};

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthStart(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function reportStartDate(period: ReportPeriod, now = new Date()) {
  if (period === "all") return null;
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "three_months") start.setMonth(start.getMonth() - 2);
  if (period === "six_months") start.setMonth(start.getMonth() - 5);
  if (period === "year") start.setMonth(0);
  return monthStart(start);
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
    if (accountId !== "all" && transaction.account_id !== accountId) return false;
    return true;
  });
}

export function reportSummary(transactions: FinancialTransaction[]) {
  return transactions.reduce(
    (summary, transaction) => {
      if (transaction.type === "income") summary.income += Number(transaction.amount);
      if (transaction.type === "expense") summary.expense += Number(transaction.amount);
      return summary;
    },
    { income: 0, expense: 0 },
  );
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

  return [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
}
