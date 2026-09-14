export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  period_start: string;
  amount_limit: number;
  created_at: string;
  updated_at: string;
};

export type BudgetSummary = Budget & { spent_amount: number };

export type BudgetInput = {
  category_id: string;
  period_start: string;
  amount_limit: number;
};

export function periodStart(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function formatBudgetPeriod(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

export function budgetPercentage(spent: number, limit: number) {
  if (limit <= 0) return 0;
  return (spent / limit) * 100;
}
